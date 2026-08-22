import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PeerEntry { pc: RTCPeerConnection; stream: MediaStream | null; userId: string }

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export const useWebRTCRoom = (roomCode?: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [connected, setConnected] = useState(false);
  const peersRef = useRef<Record<string, PeerEntry>>({});
  const channelRef = useRef<any>(null);
  const localRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(p => { try { p.pc.close(); } catch {} });
    peersRef.current = {};
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (localRef.current) localRef.current.getTracks().forEach(t => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setPeers({});
    setConnected(false);
  }, []);

  const ensurePeer = useCallback((peerId: string) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];
    const pc = new RTCPeerConnection(ICE);
    if (localRef.current) {
      localRef.current.getTracks().forEach(t => pc.addTrack(t, localRef.current!));
    }
    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setPeers(prev => ({ ...prev, [peerId]: stream }));
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'ice',
          payload: { to: peerId, from: user?.id, candidate: ev.candidate },
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        setPeers(prev => { const n = { ...prev }; delete n[peerId]; return n; });
        delete peersRef.current[peerId];
      }
    };
    const entry: PeerEntry = { pc, stream: null, userId: peerId };
    peersRef.current[peerId] = entry;
    return entry;
  }, [user?.id]);

  const join = useCallback(async () => {
    if (!roomCode || !user) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localRef.current = stream;
    setLocalStream(stream);

    const channel = supabase.channel(`talent_call:${roomCode}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'join' }, async ({ key }) => {
      if (key === user.id || peersRef.current[key]) return;
      // Tie-break: lower id initiates
      if (user.id < key) {
        const { pc } = ensurePeer(key);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({ type: 'broadcast', event: 'offer', payload: { to: key, from: user.id, sdp: offer } });
      } else {
        ensurePeer(key);
      }
    });
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      const e = peersRef.current[key];
      if (e) { try { e.pc.close(); } catch {} ; delete peersRef.current[key]; }
      setPeers(prev => { const n = { ...prev }; delete n[key]; return n; });
    });
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.to !== user.id) return;
      const { pc } = ensurePeer(payload.from);
      await pc.setRemoteDescription(payload.sdp);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      channel.send({ type: 'broadcast', event: 'answer', payload: { to: payload.from, from: user.id, sdp: ans } });
    });
    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (payload.to !== user.id) return;
      const e = peersRef.current[payload.from];
      if (e) await e.pc.setRemoteDescription(payload.sdp);
    });
    channel.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      if (payload.to !== user.id) return;
      const e = peersRef.current[payload.from];
      if (e && payload.candidate) { try { await e.pc.addIceCandidate(payload.candidate); } catch {} }
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, joined_at: new Date().toISOString() });
        setConnected(true);
      }
    });
  }, [roomCode, user, ensurePeer]);

  useEffect(() => () => cleanup(), [cleanup]);

  const toggleAudio = useCallback(() => {
    localRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
  }, []);
  const toggleVideo = useCallback(() => {
    localRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
  }, []);
  const leave = useCallback(() => cleanup(), [cleanup]);

  return { localStream, peers, connected, join, leave, toggleAudio, toggleVideo };
};

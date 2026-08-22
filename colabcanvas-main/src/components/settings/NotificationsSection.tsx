import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Play, Upload, Trash2, Volume2, BellRing } from 'lucide-react';
import {
  SOUND_PRESETS,
  type SoundPreset,
  isAiSoundEnabled,
  setAiSoundEnabled,
  getAiSoundPreset,
  setAiSoundPreset,
  getAiSoundVolume,
  setAiSoundVolume,
  getAiCustomSoundUrl,
  setAiCustomSoundUrl,
  playPreviewSound,
} from '@/lib/notifications/aiNotify';

export const NotificationsSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [preset, setPreset] = useState<SoundPreset>('chime');
  const [volume, setVolume] = useState<number>(60);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);

      // Read remote prefs (source of truth across devices)
      const { data } = await supabase
        .from('user_preferences')
        .select('notification_enabled, notification_sound, notification_volume, custom_sound_url')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const remoteEnabled = data?.notification_enabled ?? isAiSoundEnabled();
      const remotePreset = (data?.notification_sound as SoundPreset) ?? getAiSoundPreset();
      const remoteVolume = data?.notification_volume ?? getAiSoundVolume();
      const remoteCustom = data?.custom_sound_url ?? getAiCustomSoundUrl();

      setEnabled(remoteEnabled);
      setPreset(SOUND_PRESETS.some(p => p.id === remotePreset) ? remotePreset : 'chime');
      setVolume(remoteVolume);
      setCustomUrl(remoteCustom);

      // Mirror to local cache so notifications work immediately
      setAiSoundEnabled(remoteEnabled);
      setAiSoundPreset(SOUND_PRESETS.some(p => p.id === remotePreset) ? remotePreset : 'chime');
      setAiSoundVolume(remoteVolume);
      setAiCustomSoundUrl(remoteCustom ?? null);

      setLoading(false);
    })();
  }, []);

  const persist = async (patch: Partial<{ enabled: boolean; preset: SoundPreset; volume: number; customUrl: string | null }>) => {
    if (!userId) return;
    setSaving(true);
    try {
      const next = {
        notification_enabled: patch.enabled ?? enabled,
        notification_sound: patch.preset ?? preset,
        notification_volume: patch.volume ?? volume,
        custom_sound_url: patch.customUrl !== undefined ? patch.customUrl : customUrl,
      };
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, ...next }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (e: any) {
      toast.error('Could not save preferences', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const onToggle = (v: boolean) => {
    setEnabled(v);
    setAiSoundEnabled(v);
    void persist({ enabled: v });
  };

  const onPresetChange = (p: SoundPreset) => {
    setPreset(p);
    setAiSoundPreset(p);
    void persist({ preset: p });
    if (enabled) playPreviewSound(p);
  };

  const onVolumeChange = (v: number[]) => {
    const vv = v[0] ?? 60;
    setVolume(vv);
    setAiSoundVolume(vv);
  };

  const onVolumeCommit = (v: number[]) => {
    void persist({ volume: v[0] ?? 60 });
  };

  const onUpload = async (file: File) => {
    if (!userId) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file (mp3 / wav / ogg).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Sound must be under 2 MB.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'mp3';
      const path = `${userId}/notification.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('notification-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('notification-assets').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      setCustomUrl(url);
      setAiCustomSoundUrl(url);
      setPreset('custom');
      setAiSoundPreset('custom');
      await persist({ customUrl: url, preset: 'custom' });
      toast.success('Custom sound uploaded.');
      if (enabled) playPreviewSound('custom');
    } catch (e: any) {
      toast.error('Upload failed', { description: e?.message });
    } finally {
      setUploading(false);
    }
  };

  const onRemoveCustom = async () => {
    setCustomUrl(null);
    setAiCustomSoundUrl(null);
    if (preset === 'custom') {
      setPreset('chime');
      setAiSoundPreset('chime');
      await persist({ customUrl: null, preset: 'chime' });
    } else {
      await persist({ customUrl: null });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
          <BellRing className="w-5 h-5" /> Notifications
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Pick how Colab sounds when AI tasks finish.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-zinc-900">Sound notifications</Label>
            <p className="text-xs text-zinc-500 mt-0.5">Play a sound when AI generations complete</p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-zinc-900 flex items-center gap-2">
              <Volume2 className="w-4 h-4" /> Volume
            </Label>
            <span className="text-xs text-zinc-500 tabular-nums">{volume}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[volume]}
            onValueChange={onVolumeChange}
            onValueCommit={onVolumeCommit}
            disabled={!enabled}
          />
        </div>
      </Card>

      <Card className="p-5">
        <Label className="text-sm font-medium text-zinc-900">Sound preset</Label>
        <p className="text-xs text-zinc-500 mt-0.5 mb-4">Tap a preset to preview &amp; select.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SOUND_PRESETS.map((p) => {
            const active = preset === p.id;
            const disabled = p.id === 'custom' && !customUrl;
            return (
              <button
                key={p.id}
                disabled={disabled || saving}
                onClick={() => onPresetChange(p.id)}
                className={`text-left rounded-lg border px-3 py-3 transition-all ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 hover:border-zinc-400 bg-white text-zinc-900'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.label}</span>
                  {active && <Play className="w-3.5 h-3.5" />}
                </div>
                <div className={`text-[11px] mt-0.5 ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => playPreviewSound(preset)}
            disabled={!enabled}
            className="gap-2"
          >
            <Play className="w-3.5 h-3.5" /> Preview
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <Label className="text-sm font-medium text-zinc-900">Custom sound</Label>
        <p className="text-xs text-zinc-500 mt-0.5 mb-4">Upload your own short MP3/WAV (max 2 MB).</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {customUrl ? 'Replace sound' : 'Upload sound'}
          </Button>
          {customUrl && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => playPreviewSound('custom')}
              >
                <Play className="w-3.5 h-3.5" /> Preview custom
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={onRemoveCustom}
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsSection;

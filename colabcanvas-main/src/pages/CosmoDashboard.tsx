import { useState } from "react";
import { Button } from "@/components/ui/button";
import CosmoLandingCanvas from "@/components/cosmo/CosmoLandingCanvas";
import CollaboratorCursor from "@/components/cosmo/CollaboratorCursor";
import { EarlyAccessModal } from "@/components/cosmo/EarlyAccessModal";

export default function CosmoDashboard() {
  const [showEarlyAccessModal, setShowEarlyAccessModal] = useState(false);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-white via-zinc-50 to-zinc-100 overflow-hidden relative">
      
      {/* Interactive ReactFlow canvas with decorative nodes */}
      <CosmoLandingCanvas />
      
      {/* Center overlay content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="text-center pointer-events-auto">
          <h1 className="text-6xl font-bagoss text-zinc-900 mb-6">Cosmo</h1>
          <p className="text-lg text-zinc-600 max-w-lg mx-auto mb-8">
            Your infinite canvas for real-time collaborative creation, 
            with AI workflows that expand and speed your work
          </p>
          <Button 
            onClick={() => setShowEarlyAccessModal(true)}
            className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-8 py-3 text-base"
          >
            Early Access
          </Button>
        </div>
      </div>
      
      {/* Decorative collaborator cursors */}
      <CollaboratorCursor name="Jeremy" color="#8B5CF6" position={{ x: 340, y: 70 }} />
      <CollaboratorCursor name="Megan" color="#EF4444" position={{ x: 280, y: 520 }} />
      <CollaboratorCursor name="Edward" color="#10B981" position={{ x: 1100, y: 380 }} />
      
      {/* Early Access Modal */}
      <EarlyAccessModal 
        open={showEarlyAccessModal} 
        onOpenChange={setShowEarlyAccessModal} 
      />
    </div>
  );
}

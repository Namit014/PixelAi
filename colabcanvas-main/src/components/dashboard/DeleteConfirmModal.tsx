import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectTitle: string;
}

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  projectTitle,
}: DeleteConfirmModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-none p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-zinc-900">
            Delete Project?
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 mt-2">
            Are you sure you want to delete "{projectTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

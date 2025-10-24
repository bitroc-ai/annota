import { ChevronRight } from 'lucide-react';
import { useAnnotations } from 'annota';
import { Button } from '@/components/ui/button';

interface DebugPanelProps {
  currentImage: string;
  onNextImage: () => void;
}

export function DebugPanel({
  currentImage,
  onNextImage,
}: DebugPanelProps) {
  const annotations = useAnnotations();

  return (
    <div className="absolute bottom-2 right-2 z-10">
      <div className="bg-neutral-900/95 border border-neutral-800 backdrop-blur p-1 rounded-md flex items-center gap-3">
        <span className="text-xs text-neutral-400">
          Annotations: <span className="text-white font-mono">{annotations.length}</span>
        </span>
        <div className="w-px h-4 bg-neutral-700" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextImage}
          className="h-6 px-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
          title={`Next image (${currentImage})`}
        >
          <ChevronRight className="w-3 h-3" />
          {currentImage}
        </Button>
      </div>
    </div>
  );
}

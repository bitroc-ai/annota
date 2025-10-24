import { ChevronRight } from "lucide-react";
import { useAnnotations } from "annota";
import { Button } from "@/components/ui/button";

interface DebugPanelProps {
  currentImage: string;
  onNextImage: () => void;
}

export function DebugPanel({ currentImage, onNextImage }: DebugPanelProps) {
  const annotations = useAnnotations();

  return (
    <div className="absolute bottom-2 right-2 z-10">
      <div className="bg-background border backdrop-blur p-1 rounded-md flex items-center gap-3">
        <span className="text-xs">
          Annotations: <span className="font-mono">{annotations.length}</span>
        </span>
        <div className="w-px h-4" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextImage}
          className="h-6 px-2 text-xs"
          title={`Next image (${currentImage})`}
        >
          <ChevronRight className="w-3 h-3" />
          {currentImage}
        </Button>
      </div>
    </div>
  );
}

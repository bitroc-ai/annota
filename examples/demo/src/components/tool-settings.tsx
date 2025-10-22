import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ToolType } from './toolbar';

interface ToolSettingsProps {
  tool: ToolType;
  threshold: number;
  onThresholdChange: (value: number) => void;
  pushRadius: number;
  onPushRadiusChange: (value: number) => void;
}

export function ToolSettings({
  tool,
  threshold,
  onThresholdChange,
  pushRadius,
  onPushRadiusChange,
}: ToolSettingsProps) {
  if (tool === 'cell-detect') {
    return (
      <Card className="bg-neutral-900/95 border-neutral-800 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Cell Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="text-xs text-neutral-400">
            Threshold: {threshold}
            <input
              type="range"
              min="1"
              max="50"
              value={threshold}
              onChange={e => onThresholdChange(Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  if (tool === 'push') {
    return (
      <Card className="bg-neutral-900/95 border-neutral-800 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white">Push Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="text-xs text-neutral-400">
            Radius: {pushRadius}
            <input
              type="range"
              min="10"
              max="100"
              value={pushRadius}
              onChange={e => onPushRadiusChange(Number(e.target.value))}
              className="w-full mt-1"
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  return null;
}

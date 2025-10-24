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
      <Card className="bg-white/95 dark:bg-slate-950/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cell Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Threshold: {threshold}
            <input
              type="range"
              min="1"
              max="50"
              value={threshold}
              onChange={e => onThresholdChange(Number(e.target.value))}
              className="w-full mt-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  if (tool === 'push') {
    return (
      <Card className="bg-white/95 dark:bg-slate-950/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Push Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="text-xs text-slate-600 dark:text-slate-400">
            Radius: {pushRadius}
            <input
              type="range"
              min="10"
              max="100"
              value={pushRadius}
              onChange={e => onPushRadiusChange(Number(e.target.value))}
              className="w-full mt-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </label>
        </CardContent>
      </Card>
    );
  }

  return null;
}

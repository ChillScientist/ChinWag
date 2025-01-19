import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ResizableBox } from 'react-resizable';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

import 'react-resizable/css/styles.css';
import { useState } from 'react';

interface SettingsSidebarProps {
  session: {
    model: string;
    systemPrompt: string;
    options?: {
      temperature?: number;
      top_k?: number;
      top_p?: number;
      repeat_penalty?: number;
      presence_penalty?: number;
      frequency_penalty?: number;
      stop?: string[];
    };
  };
  models: { name: string }[];
  isLoadingModels: boolean;
  onUpdateSession: (updates: any) => void;
}

const SettingsSidebar = ({ session, models, isLoadingModels, onUpdateSession }: SettingsSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const currentWidth = isCollapsed ? 50 : expandedWidth;

  const updateOption = (key: string, value: any) => {
    onUpdateSession({
      options: {
        ...(session.options || {}),
        [key]: value
      }
    });
  };

  const resetOption = (key: string) => {
    const newOptions = { ...(session.options || {}) };
    delete newOptions[key];
    if (Object.keys(newOptions).length === 0) {
      onUpdateSession({ options: undefined });
    } else {
      onUpdateSession({ options: newOptions });
    }
  };

  const renderSliderSetting = (
    label: string,
    key: string,
    min: number,
    max: number,
    step: number
  ) => {
    const hasOverride = session.options?.[key] !== undefined;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className={cn(hasOverride && "text-blue-600")}>{label}</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {hasOverride ? session.options[key].toFixed(2) : 'default'}
            </span>
            {hasOverride && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => resetOption(key)}
                title="Reset to default"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[session.options?.[key] ?? (max + min) / 2]}
          onValueChange={([value]) => updateOption(key, value)}
          className={cn(!hasOverride && "opacity-50")}
        />
      </div>
    );
  };

  return (
    <ResizableBox
      width={currentWidth}
      height={Infinity}
      minConstraints={[250, Infinity]}
      maxConstraints={[600, Infinity]}
      axis="x"
      resizeHandles={['w']}
      className={cn(
        "relative flex flex-col border-l",
        !isResizing && "transition-[width] duration-200"
      )}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={(e, { size }) => {
        setIsResizing(false);
        if (!isCollapsed) {
          setExpandedWidth(size.width);
        }
      }}
      handle={
        <div
          className={cn(
            "absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/50",
            isCollapsed && "hidden"
          )}
        />
      }
    >
      <Button
        variant="secondary"
        size="sm"
        className="absolute -left-3 top-1/2 z-10 h-12 w-6 -translate-y-1/2 rounded-none border"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <ChevronRight className={cn(
          "h-4 w-4 transition-transform",
          isCollapsed && "rotate-180"
        )} />
      </Button>

      {!isCollapsed && (
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-2">Model Settings</h2>
        </div>
      )}

      <ScrollArea className="flex-1">
        {!isCollapsed && (
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select 
                value={session.model} 
                onValueChange={(model) => onUpdateSession({ model })}
                disabled={isLoadingModels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={session.systemPrompt}
                onChange={(e) => onUpdateSession({ systemPrompt: e.target.value })}
                placeholder="Enter system prompt..."
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-4">
              {renderSliderSetting("Temperature", "temperature", 0, 1, 0.01)}
              {renderSliderSetting("Top K", "top_k", 1, 100, 1)}
              {renderSliderSetting("Top P", "top_p", 0, 1, 0.01)}
              {renderSliderSetting("Repeat Penalty", "repeat_penalty", 0, 2, 0.01)}
              {renderSliderSetting("Presence Penalty", "presence_penalty", 0, 2, 0.01)}
              {renderSliderSetting("Frequency Penalty", "frequency_penalty", 0, 2, 0.01)}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className={cn(session.options?.stop && "text-blue-600")}>
                  Stop Sequences
                </Label>
                {session.options?.stop && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => resetOption('stop')}
                    title="Reset to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={session.options?.stop?.join(',') || ''}
                onChange={(e) => {
                  const values = e.target.value.split(',').filter(Boolean);
                  if (values.length > 0) {
                    updateOption('stop', values);
                  } else {
                    resetOption('stop');
                  }
                }}
                placeholder="Comma-separated stop sequences"
              />
            </div>
          </div>
        )}
      </ScrollArea>
    </ResizableBox>
  );
};

export default SettingsSidebar
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ResizableBox } from 'react-resizable';
import { ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react'; // Added ChevronLeft
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/stores/sessionStore';
import { useModelStore } from '@/stores/modelStore'; // Import useModelStore
import type { ChatSession, Options as OllamaAppOptions } from '@/components/types';

import 'react-resizable/css/styles.css';
import { useState } from 'react';

interface SettingsSidebarProps {
  session: ChatSession;
}

const SettingsSidebar = ({ session }: SettingsSidebarProps) => {
  // Get models and loading state from modelStore
  const models = useModelStore(state => state.models);
  const isLoadingModels = useModelStore(state => state.isLoadingModels);

  // Get update actions from sessionStore
  const updateSessionModel = useSessionStore(state => state.updateSessionModel);
  const updateSessionSystemPrompt = useSessionStore(state => state.updateSessionSystemPrompt);
  const updateSessionOptions = useSessionStore(state => state.updateSessionOptions);

  // Local UI state (remains the same)
  const [isCollapsed, setIsCollapsed] = useState(false); // Default to false (visible) for now
  const SIDEBAR_WIDTH_KEY = 'settingsSidebarWidth';
  const getInitialWidth = () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(SIDEBAR_WIDTH_KEY) : null;
    return stored ? parseInt(stored, 10) : 320;
  };
  const [expandedWidth, setExpandedWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const currentWidth = isCollapsed ? 1 : expandedWidth; // Use 1px when collapsed

  if (!session) {
    return null;
  }

  const handleUpdateOption = (key: keyof OllamaAppOptions, value: any) => {
    updateSessionOptions(session.id, { [key]: value });
  };

  const handleResetOption = (key: keyof OllamaAppOptions) => {
    const newOptions = { ...(session.options || {}) };
    delete (newOptions as any)[key];
    updateSessionOptions(session.id, Object.keys(newOptions).length === 0 ? undefined : newOptions);
  };

  const renderSliderSetting = (
    label: string,
    key: keyof OllamaAppOptions,
    min: number,
    max: number,
    step: number
  ) => {
    const hasOverride = session.options && (session.options as any)[key] !== undefined;
    const currentValue = (session.options && (session.options as any)[key] !== undefined)
                         ? (session.options as any)[key]
                         : (max + min) / 2;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className={cn(hasOverride && "text-blue-600")}>{label}</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {hasOverride ? (currentValue as number)?.toFixed(2) : 'default'}
            </span>
            {hasOverride && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleResetOption(key)}
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
          value={[currentValue as number]}
          onValueChange={([value]) => handleUpdateOption(key, value)}
          className={cn(!hasOverride && "opacity-50")}
        />
      </div>
    );
  };

  return (
    <ResizableBox
      width={currentWidth}
      className={cn(
        "relative flex flex-col border-l bg-background transition-[width] duration-200",
        isCollapsed && "w-0 p-0 border-none",
        !isResizing && "transition-[width] duration-200"
      )}
      // height={Infinity} // Removed duplicate
      minConstraints={[250, Infinity]}
      maxConstraints={[600, Infinity]}
      axis="x"
      resizeHandles={['w']}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={(_, { size }) => {
        setIsResizing(false);
        if (!isCollapsed) {
          setExpandedWidth(size.width);
          if (typeof window !== 'undefined') {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(size.width));
          }
        }
      }}
      handle={
        <div
          className={cn(
            "absolute left-0 top-0 -ml-1 w-2 h-full cursor-ew-resize flex items-center justify-center hover:bg-blue-500/50", // Added hover effect
            isCollapsed && "hidden",
            "group"
          )}
        />
      }
    >
      <Button
        variant="secondary"
        size="sm"
        className={cn(
          "absolute top-1/2 z-10 h-12 w-6 -translate-y-1/2 rounded-r-md rounded-l-none border-l-0 -left-3"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand settings panel" : "Collapse settings panel"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" /> // Points Right to expand
        ) : (
          <ChevronLeft className="h-4 w-4" />  // Points Left to collapse
        )}
      </Button>

      <div className={cn("overflow-hidden", isCollapsed && "hidden")}>
        <div className="p-4 border-b">
          <h2 className="font-semibold">Session Settings</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-120px)]"> {/* Adjust height as needed */}
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={session.model}
                onValueChange={(model) => updateSessionModel(session.id, model)}
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
                onChange={(e) => updateSessionSystemPrompt(session.id, e.target.value)}
                placeholder="Enter system prompt..."
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-4">
              {renderSliderSetting("Temperature", "temperature", 0, 1, 0.01)}
              {renderSliderSetting("Top K", "top_k", 0, 100, 1)}
              {renderSliderSetting("Top P", "top_p", 0, 1, 0.01)}
              {renderSliderSetting("Repeat Penalty", "repeat_penalty", 0, 2, 0.01)}
              {/* Ollama types might not have these, add if they do and are supported */}
              {/* renderSliderSetting("Presence Penalty", "presence_penalty", 0, 2, 0.01) */}
              {/* renderSliderSetting("Frequency Penalty", "frequency_penalty", 0, 2, 0.01) */}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className={cn(session.options?.stop && session.options.stop.length > 0 && "text-blue-600")}>
                  Stop Sequences
                </Label>
                {session.options?.stop && session.options.stop.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleResetOption('stop')}
                    title="Reset to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={session.options?.stop?.join(',') || ''}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  if (values.length > 0) {
                    handleUpdateOption('stop', values);
                  } else {
                    handleResetOption('stop'); // This will remove the 'stop' key if empty
                  }
                }}
                placeholder="e.g. ###, observación:"
              />
            </div>
             <div className="space-y-2">
              <Label>Stream Responses</Label>
              <Switch
                checked={session.options?.stream !== false} // Default to true if undefined
                onCheckedChange={(checked) => handleUpdateOption('stream', checked)}
              />
            </div>
          </div>
        </ScrollArea>
      </div>
    </ResizableBox>
  );
};

export default SettingsSidebar;
import React from 'react';

interface SessionLimitsProps {
  min: number;
  max: number;
  maxPossible: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}

export function SessionLimits({ min, max, maxPossible, onMinChange, onMaxChange }: SessionLimitsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">מינימום משחקים</label>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent"
            onClick={() => onMinChange(Math.max(1, min - 1))}
          >
            -
          </button>
          <span className="w-8 text-center font-medium">{min}</span>
          <button
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent"
            onClick={() => onMinChange(Math.min(max, min + 1))}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">מקסימום משחקים</label>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent"
            onClick={() => onMaxChange(Math.max(min, max - 1))}
          >
            -
          </button>
          <span className="w-8 text-center font-medium">{max}</span>
          <button
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-accent"
            onClick={() => onMaxChange(Math.min(maxPossible, max + 1))}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

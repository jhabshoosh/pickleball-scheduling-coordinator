import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DayPreference, DayOfWeek } from 'shared/types';
import { HEBREW_DAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PreferenceRankerProps {
  preferences: DayPreference[];
  onChange: (prefs: DayPreference[]) => void;
}

function SortableItem({ pref, index }: { pref: DayPreference; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pref.day });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-white cursor-grab active:cursor-grabbing',
        isDragging && 'shadow-lg opacity-80'
      )}
      {...attributes}
      {...listeners}
    >
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
        {index + 1}
      </span>
      <span className="font-medium">יום {HEBREW_DAYS[pref.day as DayOfWeek]}</span>
      <span className="mr-auto text-muted-foreground text-xs">☰ גרור לסידור</span>
    </div>
  );
}

export function PreferenceRanker({ preferences, onChange }: PreferenceRankerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = preferences.findIndex(p => p.day === active.id);
    const newIndex = preferences.findIndex(p => p.day === over.id);
    const reordered = arrayMove(preferences, oldIndex, newIndex);
    onChange(reordered.map((p, i) => ({ ...p, rank: i + 1 })));
  };

  if (preferences.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-3">גרור כדי לסדר לפי עדיפות (1 = הכי מועדף)</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={preferences.map(p => p.day)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {preferences.map((pref, i) => (
              <SortableItem key={pref.day} pref={pref} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

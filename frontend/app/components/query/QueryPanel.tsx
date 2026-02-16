"use client";

import { useQueryState } from "./useQueryState";
import { useRunJob } from "./useRunJob";
import CoordinateSection from "./CoordinateSection";
import DateRangeSection from "./DateRangeSection";
import SavedQueryDropdown from "./SavedQueryDropdown";
import ActionBar from "./ActionBar";

type Props = {
  onSelectArea: () => void;
};

export default function QueryPanel({ onSelectArea }: Props) {
  const state = useQueryState();
  const { handleRun, status, error } = useRunJob(
    state.selection,
    state.verticesText,
    state.bufferKm,
    state.startDate,
    state.endDate
  );

  const isSubmitting = status === "submitting";

  return (
    <div className="crt-panel">
      <SavedQueryDropdown
        queries={state.savedQueries}
        selected={state.selectedQueryName}
        onSelect={state.handleSelectSavedQuery}
        onDelete={state.handleDeleteSavedQuery}
        disabled={isSubmitting}
      />

      <CoordinateSection
        verticesText={state.verticesText}
        onVerticesChange={state.handleVerticesChange}
        bufferKm={state.bufferKm}
        onBufferChange={state.handleBufferChange}
        selection={state.selection}
      />

      <hr className="crt-divider" />

      <DateRangeSection
        startDate={state.startDate}
        endDate={state.endDate}
        onStartChange={state.handleStartDateChange}
        onEndChange={state.handleEndDateChange}
        openPicker={state.openPicker}
        onTogglePicker={(which) =>
          state.setOpenPicker((prev) => (prev === which ? null : which))
        }
      />

      <hr className="crt-divider" />

      <ActionBar
        queryName={state.queryName}
        onQueryNameChange={(val) => {
          state.setQueryName(val);
          if (state.selectedQueryName) state.setSelectedQueryName(null);
        }}
        onSave={state.handleSaveCurrent}
        onSelectArea={onSelectArea}
        onRun={handleRun}
        status={status}
        error={error}
      />
    </div>
  );
}

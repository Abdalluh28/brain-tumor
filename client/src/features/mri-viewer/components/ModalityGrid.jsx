import { MODALITY_SLOT_COUNT } from "../constants";
import ModalitySlot from "./ModalitySlot";

export default function ModalityGrid({
  volumes,
  sliceIndex,
  canvasRefs,
  onRemoveVolume,
  onSlotUpload,
  onWheel,
}) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full"
      onWheel={onWheel}
    >
      {Array.from({ length: MODALITY_SLOT_COUNT }, (_, idx) => (
        <ModalitySlot
          key={idx}
          slotIdx={idx}
          vol={volumes[idx]}
          sliceIndex={sliceIndex}
          canvasRef={(el) => {
            canvasRefs.current[idx] = el;
          }}
          onRemove={onRemoveVolume}
          onSlotUpload={onSlotUpload}
        />
      ))}
    </div>
  );
}

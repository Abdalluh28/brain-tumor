import { Upload, X } from 'lucide-react'
import { memo } from 'react'

// Each upload slot component
const UploadSlot = memo(({ index, image, onUpload, onDelete, disabled }) => {
    return (
        <div className="rounded-lg shadow-md bg-white border border-dashed border-slate-300 p-4 flex flex-col gap-2 dark:bg-background dark:border-slate-700">

            {/* Slot header */}
            <div className="flex justify-between">
                <p className='text-slate-400'>View {index}</p>
                {image && (
                    <button className="text-gray-500 cursor-pointer bg-gray-50 p-1 rounded-2xl hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white transition duration-300"
                        onClick={() => onDelete(index)} aria-label={`Remove MRI view ${index}`}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Display uploaded image or upload input */}
            {image ? (
                <div className="flex flex-col gap-4">
                    <img
                        className="w-full h-48 object-contain"
                        src={image.previewURL}
                        alt={`view-${index}`}
                    />
                    <div className='flex flex-col gap-1'>
                        <p className="text-sm truncate dark:text-slate-300">{image.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            {(image.size / 1024).toFixed(2)} KB
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <label
                        htmlFor={`upload-view-${index}`}
                        aria-label={`Upload MRI view ${index}`}
                        className={`bg-primary/5 flex flex-col items-center justify-center gap-2 py-18 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <p className='text-primary bg-primary/7 p-3 rounded-lg'>
                            <Upload size={28} />
                        </p>
                        <p className="text-sm">Drop file here</p>
                    </label>
                    <input
                        type="file"
                        id={`upload-view-${index}`}
                        className="hidden"
                        accept="image/*, .nii, .nii.gz, .dcm"
                        onChange={onUpload}
                        disabled={disabled}
                    />
                </>
            )}
        </div>
    )
})

export default UploadSlot

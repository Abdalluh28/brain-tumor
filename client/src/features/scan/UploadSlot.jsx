import { Box, FileImage, Upload, X } from 'lucide-react'
import { memo } from 'react'

const MODALITY_ORDER = ['T1N', 'T1C', 'T2W', 'T2F']
// Each upload slot component
const UploadSlot = memo(({ index, file, onUpload, onDelete, disabled, scanType }) => {
    const is3D = scanType === '3D'

    return (
        <div className="rounded-lg shadow-md bg-white border border-dashed border-slate-300 p-4 flex flex-col gap-2 dark:bg-background dark:border-slate-700">

            {/* Slot header */}
            <div className="flex justify-between">
                <p className='text-slate-400'>{MODALITY_ORDER[index]}</p>
                {file && (
                    <button className="text-gray-500 cursor-pointer bg-gray-50 p-1 rounded-2xl hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white transition duration-300"
                        onClick={() => onDelete(index)} aria-label={`Remove MRI view ${index}`}>
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Display uploaded file or upload input */}
            {file ? (
                <>
                    {file.type === 'image' ? (
                        <img
                            className="w-full h-48 object-contain"
                            src={file.previewURL}
                            alt={`view-${index}`}
                        />
                    ) : (
                        <div className="w-full h-48 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 text-primary">
                            <Box size={52} />
                        </div>
                    )}
                    <div className='flex flex-col gap-1'>
                        <p className="text-sm truncate dark:text-slate-300">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            {(file.size / 1024).toFixed(2)} KB
                        </p>
                    </div>
                </>

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
                        <div className="flex items-center gap-2 text-sm">
                            {is3D ? <Box size={16} /> : <FileImage size={16} />}
                            <span>{is3D ? 'Drop 3D volume here' : 'Drop image here'}</span>
                        </div>
                    </label>
                    <input
                        type="file"
                        id={`upload-view-${index}`}
                        className="hidden"
                        accept={is3D ? '.nii,.nii.gz,.dcm' : 'image/png,image/jpeg,image/jpg'}
                        onChange={onUpload}
                        disabled={disabled}
                    />
                </>
            )}
        </div>
    )
})

export default UploadSlot

import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { removeFile, uploadFile } from './scanSlice'
import StartAnalysisCard from './StartAnalysisCard'
import UploadBanner from './UploadBanner'
import UploadSlot from './UploadSlot'

export default function UploadScanCard() {

    const files = useSelector(state => state.scan.files)
    const uploadedSlots = files.length
    const emptySlots = 4 - uploadedSlots
    const dispatch = useDispatch()

    const validateFile = (file) => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/jpg']
        const medicalExtensions = ['.nii', '.nii.gz', '.dcm']
        const maxSize = 50 * 1024 * 1024 // 50MB for MRI files

        const isImage = imageTypes.includes(file.type)
        const isMedical =
            medicalExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

        if (!isImage && !isMedical) {
            toast.error('Unsupported file type')
            return false
        }

        if (file.size > maxSize) {
            toast.error('File size exceeds 50MB')
            return false
        }

        return true
    }

    const handleUpload = (e) => {
        const selectedFiles = Array.from(e.target.files)
        const remainingSlots = 4 - files.length

        selectedFiles.slice(0, remainingSlots).forEach(file => {
            if (!validateFile(file)) return

            const isImage = file.type.startsWith('image/')

            if (isImage) {
                const reader = new FileReader()
                reader.onloadend = () => {
                    dispatch(uploadFile({
                        name: file.name,
                        size: file.size,
                        type: 'image',
                        previewURL: reader.result,
                        rawFile: file,
                    }))
                }
                reader.readAsDataURL(file)
            } else {
                dispatch(uploadFile({
                    name: file.name,
                    size: file.size,
                    type: file.name.endsWith('.dcm') ? 'dicom' : 'nifti',
                    rawFile: file,
                }))
            }
        })

        e.target.value = null
    }

    const deleteFile = (index) => {
        const file = files[index - 1]
        if (file) dispatch(removeFile(file.id))
    }

    return (
        <div className='w-full flex flex-col gap-6'>
            {/* Status Banner */}
            <UploadBanner uploadedSlots={uploadedSlots} emptySlots={emptySlots} />

            {/* Upload Slots Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6'>
                {[1, 2, 3, 4].map(item => (
                    <UploadSlot
                        key={item}
                        index={item}
                        file={files[item - 1]}
                        onUpload={handleUpload}
                        onDelete={deleteFile}
                        disabled={files.length === 4} />
                ))}
            </div>

            {/* Main Upload Button */}
            {uploadedSlots < 4 ? (
                <div className='w-fit self-center'>
                    <label htmlFor='upload' className={`bg-primary flex items-center justify-center gap-2 py-4 px-20 text-lg text-white rounded-2xl hover:bg-primary-hover transition duration-300 ${files.length === 4 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <Upload size={20} />
                        <p>
                            {uploadedSlots === 0 ? 'Select files to upload'
                                : uploadedSlots < 4 ? `Add More Files (${emptySlots} remaining)`
                                    : 'Start Analysis'}
                        </p>
                    </label>
                    {/* images or nifti files */}
                    <input type='file' id='upload' multiple accept='image/*, .nii, .nii.gz, .dcm' className='hidden'
                        onChange={(e) => handleUpload(e)}
                        disabled={files.length === 4} />
                </div>
            ) : (
                <StartAnalysisCard />
            )}
        </div >
    )
}

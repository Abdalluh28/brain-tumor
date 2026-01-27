// Importing icons and libraries
import { CircleAlert, CircleCheckBig, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { removeImage, uploadImage as uploadImageRedux } from './scanSlice'
import UploadSlot from './UploadSlot'
import UploadBanner from './UploadBanner'

export default function UploadScanCard() {

    // Getting the uploaded images from Redux store
    const images = useSelector(state => state.scan.images)
    const uploadedSlots = images.length       // number of uploaded images
    const emptySlots = 4 - uploadedSlots      // remaining slots
    const dispatch = useDispatch()

    // Function to validate uploaded files
    const validateFile = (file) => {
        const allowedFiles = ['image/jpeg', 'image/png', 'image/jpg'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedFiles.includes(file.type)) {
            toast.error('Invalid file type. Please upload a JPEG, PNG, or JPG file.');
            return false;
        }

        if (file.size > maxSize) {
            toast.error('File size exceeds the maximum limit of 5MB.');
            return false;
        }

        return true;
    }

    // Handles file upload
    const handleUpload = (e) => {
        const files = e.target.files;
        const remainingSlots = 4 - images.length;
        const filesToAdd = Array.from(files).slice(0, remainingSlots); // limit uploads to remaining slots

        filesToAdd.forEach(file => {
            if (!validateFile(file)) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                dispatch(uploadImageRedux({
                    previewURL: reader.result,
                    name: file.name,
                    size: file.size
                }))
            }
            reader.readAsDataURL(file);
        })

        e.target.value = null; // reset input
    }

    // Deletes image from Redux store
    const deleteImage = (index) => {
        const imageToDelete = images[index - 1];
        if (imageToDelete) {
            dispatch(removeImage(imageToDelete.id));
        }
    }

    return (
        <div className='w-full flex flex-col gap-6'>
            {/* Status Banner */}
            <UploadBanner uploadedSlots={uploadedSlots} emptySlots={emptySlots} />

            {/* Upload Slots Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6'>
                {[1, 2, 3, 4].map(item => (
                    <UploadSlot key={item} index={item} image={images[item - 1]} onUpload={handleUpload} onDelete={deleteImage} disabled={images.length === 4} />
                ))}
            </div>

            {/* Main Upload Button */}
            <div className='w-fit self-center'>
                <label htmlFor='upload' className={`bg-primary flex items-center justify-center gap-2 py-4 px-20 text-lg text-white rounded-2xl hover:bg-primary-hover transition duration-300 ${images.length === 4 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <Upload size={20} />
                    <p>Select files to upload</p>
                </label>
                <input type='file' id='upload' multiple accept='image/*' className='hidden'
                    onChange={(e) => handleUpload(e)}
                    disabled={images.length === 4} />
            </div>
        </div >
    )
}

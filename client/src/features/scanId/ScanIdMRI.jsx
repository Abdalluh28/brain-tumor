
export default function ScanIdMRI({ originalMRI, files }) {
    const imageFiles = files?.filter(f => ['png', 'jpg', 'jpeg'].includes(f.format?.toLowerCase()) && (f.url || f.rawPath)) || [];

    return (
        <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 rounded-xl shadow-md mb-8">
            <div className="">
                <p className='font-semibold text-xl'>Original MRI Scan</p>
                {imageFiles.length > 0 ? (
                    <div className='grid grid-cols-2 gap-4 mt-4'>
                        {imageFiles.map((file, idx) => (
                            <div key={idx} className='rounded-lg p-2 border dark:border-slate-700 flex flex-col items-center'>
                                <img
                                    src={file.url || file.rawPath}
                                    alt={`Original MRI scan ${idx + 1}`}
                                    className="max-h-64 w-auto object-contain rounded-md shadow-sm"
                                />
                                <span className="text-sm text-gray-500 mt-2">{file.originalName || `Scan ${idx + 1}`}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='rounded-lg p-4 flex justify-center items-center'>
                        <img
                            src={originalMRI}
                            alt="Original MRI scan preview"
                            className="max-h-105 w-auto object-contain rounded-md shadow-sm"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

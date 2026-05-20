
export default function ScanIdMRI({ originalMRI }) {
    return (
        <div className="flex flex-col gap-4 bg-white dark:bg-background dark:border dark:border-slate-600 p-6 rounded-xl shadow-md mb-8">
            <div className="">
                <p className='font-semibold text-xl'>Original MRI Scan</p>
                <div className='rounded-lg p-4 flex justify-center items-center'>
                    <img
                        src={originalMRI}
                        alt="Original MRI scan"
                        className="max-h-105 w-auto object-contain rounded-md shadow-sm"
                    />
                </div>
            </div>
        </div>
    )
}

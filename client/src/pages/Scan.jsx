import ScanCards from '@/features/scan/ScanCards'
import ScanForm from '@/features/scan/ScanForm'
import ScanHeader from '@/features/scan/ScanHeader'

export default function Scan() {
    return (
        <>
            <ScanHeader />
            <div className='flex flex-col gap-8 justify-center items-center mt-8 mb-16 mx-12'>
                <ScanForm />
                <ScanCards />
            </div>
        </>
    )
}

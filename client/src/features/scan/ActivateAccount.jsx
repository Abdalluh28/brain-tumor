import Spinner from "@/components/Spinner";
import { useSendActivationRequest } from "./useSendActivationRequest"

export default function ActivateAccount() {

    const {sendActivationRequest, isLoading} = useSendActivationRequest();

    const handleSendRequest = () => {
        sendActivationRequest();
    }

    return (
        <div className='flex flex-col gap-2 mt-2'>
            <p>Reach out to your admin to activate your account</p>
            <button
                className='w-fit bg-blue-600 hover:bg-blue-700 transition duration-300 hover:cursor-pointer text-white px-6 py-2 rounded-xl text-lg'
                onClick={handleSendRequest}
                disabled={isLoading}>
                {isLoading ? <Spinner color="white" /> : 'Send Request'}
            </button>
        </div>
    )
}

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PREDICTION_CONFIG } from "@/config/predictionConfig";
import { Eye, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeleteScan } from "./useDeleteScan";
import Swal from "sweetalert2";

export default function HistoryTableCell({ scan }) {

    const navigate = useNavigate();
    const key = scan.prediction?.toLowerCase() || 'healthy';
    const config = PREDICTION_CONFIG[key];

    // data and time
    const date = scan.createdAt.split('T')[0];
    const time = scan.createdAt.split('T')[1].split('.')[0];
    const confidence = scan.confidenceScores[scan.prediction] || 0;


    const { deleteScan, isLoading } = useDeleteScan();
    const handleDeleteScan = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteScan(scan._id);
            }
        })
    };

    return (
        <>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{scan._id}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p>{date}</p>
                <p className="text-xs text-slate-400">{time}</p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p className={`px-2 py-1 text-sm rounded-lg text-center capitalize ${config.textColor} ${config.bg} `}>
                    {scan.prediction || 'Healthy'}
                </p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{confidence}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p className={`px-2 py-1 text-sm rounded-lg text-center capitalize ${scan.status === 'completed' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>{scan.status}</p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{scan.radiologist || 'N/A'}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white flex gap-4'>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className='cursor-pointer hover:text-primary transition duration-300'
                            onClick={() => navigate(`/scan/${scan._id}`)}>
                            <Eye />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>View</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className='cursor-pointer hover:text-red-500 transition duration-300'
                            onClick={handleDeleteScan}
                            disabled={isLoading}>
                            <Trash />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Delete</p>
                    </TooltipContent>
                </Tooltip>
            </td>
        </>
    )
}

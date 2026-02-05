import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PREDICTION_CONFIG } from "@/config/predictionConfig";
import { Eye, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HistoryTableCell({ item }) {

    const navigate = useNavigate();
    const key = item.prediction.toLowerCase();
    const config = PREDICTION_CONFIG[key];

    return (
        <>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{item.scanId}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{item.patientId}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p>{item.date}</p>
                <p className="text-xs text-slate-400">{item.time}</p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p className={`px-2 py-1 text-sm rounded-lg text-center capitalize ${config.textColor} ${config.bg} `}>
                    {item.prediction}
                </p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{item.confidence}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>
                <p className={`px-2 py-1 text-sm rounded-lg text-center capitalize ${item.status === 'completed' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>{item.status}</p>
            </td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white'>{item.radiologist}</td>
            <td className='py-3 px-6 text-sm text-slate-600 dark:text-white flex gap-4'>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className='cursor-pointer hover:text-primary transition duration-300'
                            onClick={() => navigate(`/scan/${item.scanId}`)}>
                            <Eye />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>View</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className='cursor-pointer hover:text-red-500 transition duration-300'>
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

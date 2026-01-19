import LineChart from './LineChart';
import PieChart from './PieChart';



export default function DashboardCharts() {
    return (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 m-4'>
            <LineChart />
            <PieChart />
        </div>
    )
}

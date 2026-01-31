import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function ScanId() {

    const scanId = useParams().scanId;
    useEffect(() => {
        console.log(scanId)
    } , [scanId]);
    return (
        <div>ScanId: {scanId}</div>
    )
}

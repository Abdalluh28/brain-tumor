import React, { useEffect } from 'react'
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom'

export default function ScanId() {

    const scanId = useParams().scanId;
    const files = useSelector(state => state.scan.files);
    useEffect(() => {
        console.log(scanId)
        console.log(files)
    } , [scanId, files]);
    return (
        <div>ScanId: {scanId}</div>
    )
}

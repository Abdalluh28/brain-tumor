import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setNewPatient } from './scanSlice';

export default function NewPatientToggle() {

    const newPatient = useSelector(state => state.scan.newPatient);
    const dispatch = useDispatch();

    const handleNewPatientToggle = (e) => {
        e.preventDefault();
        dispatch(setNewPatient(!newPatient));
    }

    return (
        <div className='flex gap-1'>
            <p>{newPatient ? "Patient already exists?" : "Adding new patient?"}</p>
            <button type='button' onClick={handleNewPatientToggle}
                className='text-primary underline underline-offset-2 cursor-pointer transition duration-300 hover:text-primary-hover'>Click here</button>
        </div>
    )
}

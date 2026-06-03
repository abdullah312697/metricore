import { forwardRef } from "react";

// 1. Wrap the entire component in forwardRef
const PreDelete = forwardRef(({ confirmDelete, preDeleting }, ref) => {
    const cencelPopup = () => {
        const getpr = document.querySelector(".preDeletebtnContainer");
        if (getpr) getpr.style.display = "none";
    };
    return (
        <div className='preDeletebtnContainer' ref={ref}>
            <div className="preDeletePopup">
                <h6>Are you sure to Delete!?</h6>
                <div className='deleteornotbutton'>
                    <button className='nextnotsupportbtn' onClick={cencelPopup}>No</button>
                    <button className='nextsupportbtn' onClick={confirmDelete}>Yes</button>
                </div>
            </div>
            {preDeleting && <div className='spinner'></div>}
        </div>
    );
});

export default PreDelete;
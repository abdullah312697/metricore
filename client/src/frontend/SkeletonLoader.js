// src/components/SkeletonLoader.js
import React from 'react';
import '../style/SkeletonLoader.css';

const SkeletonLoader = ({mainGap,mainWidth,mainHeight,headingW,headingH,chaildOneW,allChaieldH,chaildTwoW,chaildThreeW,chaildForeW}) => {
  return (
    <div className="skeleton" style={{width:mainWidth,height:mainHeight,gap:mainGap}}>
      <div className="skeleton-header" style={{width:headingW,height:headingH}}></div>
      <div className="skeleton-row" style={{width:chaildOneW,height:allChaieldH}}></div>
      <div className="skeleton-row" style={{width:chaildTwoW,height:allChaieldH}}></div>
      <div className="skeleton-row" style={{width:chaildThreeW,height:allChaieldH}}></div>
      <div className="skeleton-row" style={{width:chaildForeW,height:allChaieldH}}></div>
    </div>
  );
};

export default SkeletonLoader;

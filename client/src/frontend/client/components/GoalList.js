// import { useEffect, useState, useCallback } from "react";
// import EditIcon from "@mui/icons-material/Edit";
// import AddIcon  from "@mui/icons-material/Add";
// import Sparkline from "./Sparkline";
// import { Altaxios } from "../../Altaxios";
// import { Link }    from "react-router-dom";
// import "../../../style/view.css";
// import { useAuth } from "../../../context/AuthContext";

// const View = () => {
//   const [allData,      setAllData]      = useState([]);
//   const [sparkMap,     setSparkMap]     = useState({});
//   const [loadingGoals, setLoadingGoals] = useState(true);
//   const [loadingSpark, setLoadingSpark] = useState(false);
//   const {user} = useAuth();

//   // ── Fetch goals ─────────────────────────────────────────────
//   useEffect(() => {
//     setLoadingGoals(true);
//     Altaxios.get("/setgole/getGoleData")
//       .then((res) => {
//         if (res.status === 200) setAllData(res.data);
//       })
//       .catch(console.error)
//       .finally(() => setLoadingGoals(false));
//   }, []);
 
//   // ── Fetch sparkline data after goals load ───────────────────
//   const fetchSparklines = useCallback(() => {
//     if (!allData.length) return;
//     setLoadingSpark(true);
//     Altaxios.get("/setgole/goalSparklineData")
//       .then((res) => {
//         if (res.status === 200) {
//           const map = {};
//           res.data.data.forEach((item) => {
//             map[item.goalId.toString()] = item;
//           });
//           setSparkMap(map);
//         }
//       })
//       .catch(console.error)
//       .finally(() => setLoadingSpark(false));
//   }, [allData]);
 
//   useEffect(() => {
//     fetchSparklines();
//   }, [fetchSparklines]);
 
//   // ── Render sparkline cell ───────────────────────────────────
//   const renderSpark = (goal) => {
//     const spark = sparkMap[goal._id?.toString()];
 
//     // Still loading
//     if (loadingSpark && !spark) {
//       return <div className="spark-placeholder" />;
//     }
 
//     // No spark data for this goal yet
//     if (!spark) {
//       return <div className="spark-nodata">—</div>;
//     }
 
//     // Pending goal (not started)
//     if (spark.isPending) {
//       return (
//         <div className="spark-wrap">
//           <div className="spark-nodata spark-nodata--pending">Upcoming</div>
//           <span className="spark-pct" style={{ color: "#f59e0b" }}>—</span>
//         </div>
//       );
//     }
 
//     // Ensure at least 2 valid points before rendering
//     const safePoints = (spark.points || []).filter(
//       (p) => p.x != null && !isNaN(p.x) && p.y != null
//     );
 
//     return (
//       <div className="spark-wrap">
//         {safePoints.length >= 2 ? (
//           <Sparkline
//             points={safePoints}
//             height={35}
//             withArea
//             color={spark.color}
//           />
//         ) : (
//           <div className="spark-nodata">No chart</div>
//         )}
 
//         <div className="spark-meta">
//           <span
//             className="spark-pct"
//             style={{ color: spark.color }}
//           >
//             {spark.achievementPct ?? 0}%
//           </span>
//           <span
//             className="spark-status"
//             style={{ color: spark.color }}
//           >
//             {spark.isOnTrack ? "▲" : "▼"}
//           </span>
//         </div>
//       </div>
//     );
//   };
 
//   // ── Render ──────────────────────────────────────────────────
//   if (loadingGoals) {
//     return (
//       <div className="View">
//         <div className="viewInnerMain">
//           <div className="vg-loading">Loading goals...</div>
//         </div>
//       </div>
//     );
//   }
 
//   return (
//     <div className="View">
//       <div className="viewInnerMain">
 
//         <div className="cashFlowHeading">
//           <h1 className="biusinness__cashflowheading">
//             Current Goals ({allData.length || 0})
//           </h1>
//           <Link to={`/company/${user?.companyName}/creategoal`}>Set Goals</Link>
//         </div>
 
//         <div className="allGoalList">
//           <div className="allGoalListTopSection">
//             <div className="allGoalListHeader">
//               <div className="allGoalListHeader_dateName">Name</div>
//               <div className="allGoalListHeader_dateProgress">Milestone</div>
//               <div className="allGoalListHeader_dateAmount">Amount</div>
//               <div className="allGoalListHeader_dateView">View</div>
//               <div className="allGoalListHeader_dateEdit">Edit</div>
//             </div>
//           </div>
 
//           <div className="allGoalInnerContainer">
//             {allData.length > 0 ? (
//               allData.map((goal, index) => (
//                 <div
//                   className="allGoalListInner"
//                   key={goal._id}
//                   style={{
//                     backgroundColor: index % 2 === 0 ? "#011626" : "#cccccc1a",
//                   }}
//                 >
//                   {/* Name */}
//                   <div className="allGoal_allinOneStyle allGoalListInner_dateName">
//                     {goal.targetName}
//                   </div>
 
//                   {/* Sparkline */}
//                   <div className="allGoal_allinOneStyle allGoalListInner_dateProgress">
//                     {renderSpark(goal)}
//                   </div>
 
//                   {/* Amount */}
//                   <div className="allGoal_allinOneStyle allGoalListInner_dateAmount">
//                     ${(goal.targetAmount || 0).toLocaleString()}
//                   </div>
 
//                   {/* View */}
//                   <div className="allGoal_allinOneStyle allGoalListInner_dateView">
//                     <Link to={`/company/${user?.companyName}/viewgoal/${goal._id}`}>View</Link>
//                   </div>
 
//                   {/* Edit */}
//                   <Link to={`/company/${user?.companyName}/updategoal/${goal._id}`}>
//                     <EditIcon className="allGoal_allinOneStyle allGoalListInner_dateEdit" />
//                   </Link>
//                 </div>
//               ))
//             ) : (
//               <div className="ProductAddInner" style={{ height: "225px" }}>
//                 <Link to={`/company/${user?.companyName}/creategoal`}>
//                   <div className="PorductAddInnerContainer">
//                     <h4>Add Goal</h4>
//                     <AddIcon />
//                   </div>
//                 </Link>
//               </div>
//             )}
//           </div>
//         </div>
 
//       </div>
//     </div>
//   );
// };
 
// export default View;

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon  from "@mui/icons-material/Add";
import Sparkline from "./Sparkline";
import { Altaxios } from "../../Altaxios";
import { useAuth } from "../../../context/AuthContext";
import "../../../style/GoalList.css";

/* ═══════════════════════════════════════════════════════════════
   View — goals card for the main dashboard.

   Sibling of EmployeeList / ProductList: fits .MainContainerChunk
   (600x300, overflow:hidden) as three stacked regions:

     .gl-topbar  — fixed  (title, count, Set goals)
     .gl-head    — fixed  (column labels)
     .gl-scroll  — SCROLLS (all .gl-row goal rows)

   All data fetching, the sparkline map, and renderSpark are exactly
   as you had them — only the markup/classNames changed.
═══════════════════════════════════════════════════════════════ */
const View = () => {
  const [allData,      setAllData]      = useState([]);
  const [sparkMap,     setSparkMap]     = useState({});
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [loadingSpark, setLoadingSpark] = useState(false);
  const { user } = useAuth();

  // ── Fetch goals ─────────────────────────────────────────────
  useEffect(() => {
    setLoadingGoals(true);
    Altaxios.get("/setgole/getGoleData")
      .then((res) => {
        if (res.status === 200) setAllData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoadingGoals(false));
  }, []);

  // ── Fetch sparkline data after goals load ───────────────────
  const fetchSparklines = useCallback(() => {
    if (!allData.length) return;
    setLoadingSpark(true);
    Altaxios.get("/setgole/goalSparklineData")
      .then((res) => {
        if (res.status === 200) {
          const map = {};
          res.data.data.forEach((item) => {
            map[item.goalId.toString()] = item;
          });
          setSparkMap(map);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSpark(false));
  }, [allData]);

  useEffect(() => {
    fetchSparklines();
  }, [fetchSparklines]);

  // ── Render sparkline cell ───────────────────────────────────
  const renderSpark = (goal) => {
    const spark = sparkMap[goal._id?.toString()];

    if (loadingSpark && !spark) {
      return <div className="gl-spark-skeleton" />;
    }

    if (!spark) {
      return <span className="gl-dash">—</span>;
    }

    if (spark.isPending) {
      return (
        <div className="gl-spark">
          <span className="gl-upcoming">Upcoming</span>
        </div>
      );
    }

    const safePoints = (spark.points || []).filter(
      (p) => p.x != null && !isNaN(p.x) && p.y != null
    );

    return (
      <div className="gl-spark">
        <div className="gl-spark__chart">
          {safePoints.length >= 2 ? (
            <Sparkline
              points={safePoints}
              height={30}
              withArea
              color={spark.color}
            />
          ) : (
            <span className="gl-dash">No chart</span>
          )}
        </div>

        <div className="gl-spark__meta gl-mono" style={{ color: spark.color }}>
          <span className="gl-spark__pct">{spark.achievementPct ?? 0}%</span>
          <span className="gl-spark__arrow">{spark.isOnTrack ? "▲" : "▼"}</span>
        </div>
      </div>
    );
  };

  // ── Loading state ───────────────────────────────────────────
  if (loadingGoals) {
    return (
      <div className="gl-root">
        <div className="gl-topbar">
          <div className="gl-topbar__left">
            <h2 className="gl-title">Goals</h2>
          </div>
        </div>
        <div className="gl-scroll gl-scroll--empty">
          <span className="gl-loading gl-mono">LOADING GOALS…</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="gl-root">

      {/* ══ FIXED: top bar ═══════════════════════════════════ */}
      <div className="gl-topbar">
        <div className="gl-topbar__left">
          <h2 className="gl-title">Goals</h2>
          {allData.length > 0 && (
            <span className="gl-count gl-mono">{allData.length}</span>
          )}
        </div>

        <Link
          to={`/company/${user?.companyName}/creategoal`}
          className="gl-btn gl-btn--add"
        >
          <AddIcon style={{ fontSize: 16 }} />
          Set goal
        </Link>
      </div>

      {allData.length > 0 ? (
        <>
          {/* ══ FIXED: column header ═════════════════════════ */}
          <div className="gl-head">
            <span className="gl-col-name">Name</span>
            <span className="gl-col-progress">Milestone</span>
            <span className="gl-col-amount">Amount</span>
            <span className="gl-col-action" />
          </div>

          {/* ══ SCROLLABLE: goal rows ════════════════════════ */}
          <div className="gl-scroll">
            {allData.map((goal) => (
              <div className="gl-row" key={goal._id}>

                <span className="gl-col-name">{goal.targetName || "—"}</span>

                <span className="gl-col-progress">{renderSpark(goal)}</span>

                <span className="gl-col-amount gl-mono">
                  <span className="gl-currency">$</span>
                  {(goal.targetAmount || 0).toLocaleString()}
                </span>

                <span className="gl-col-action">
                  <Link
                    to={`/company/${user?.companyName}/viewgoal/${goal._id}`}
                    className="gl-view"
                  >
                    View
                  </Link>
                  <Link
                    to={`/company/${user?.companyName}/updategoal/${goal._id}`}
                    className="gl-edit"
                    aria-label={`Edit ${goal.targetName || "goal"}`}
                    title="Edit goal"
                  >
                    <EditIcon style={{ fontSize: 15 }} />
                  </Link>
                </span>

              </div>
            ))}
          </div>
        </>
      ) : (
        /* ══ empty state (fills remaining height) ═══════════ */
        <div className="gl-scroll gl-scroll--empty">
          <Link to={`/company/${user?.companyName}/creategoal`} className="gl-empty">
            <AddIcon style={{ fontSize: 28, color: "#ffb100" }} />
            <h4>Set your first goal</h4>
          </Link>
        </div>
      )}
    </div>
  );
};

export default View;
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Calendar from "../../deshbord/components/calender/Calendar";

import {
  differenceInYears,
  differenceInMonths,
  differenceInWeeks,
  differenceInDays,
  parse,
  isValid,
} from "date-fns";

function ChangeDate({ currentViewGoal, AddStepnOpen, setDateRange, filterdate, deffirentInDays, isClicked, progressState }) {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState("today");
  const [startDateView, setStartDateView] = useState("");
  const [endDateView, setEndDateView] = useState("");
  const [isOpenCalanderOne, setIsOpenCalanderOne] = useState(false);
  const [isOpenCalanderTwo, setIsOpenCalanderTwo] = useState(false);
  const calendarWrapperRef = useRef(null);

  // 🔹 Date difference (memoized)
  const normalize = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const calculateCustomTarget = useCallback(() => {
  if (!currentViewGoal) return 0;

  const goalStart = normalize(currentViewGoal.targetStartDate);
  const goalEnd = normalize(currentViewGoal.targetEndDate);

  const parsedStart = parse(startDateView, "dd/MM/yyyy", new Date());
  const parsedEnd = parse(endDateView, "dd/MM/yyyy", new Date());

  if (!isValid(parsedStart) || !isValid(parsedEnd)) return 0;

  let customStart = normalize(parsedStart);
  let customEnd = normalize(parsedEnd);

  if (customStart < goalStart) customStart = goalStart;
  if (customEnd > goalEnd) customEnd = goalEnd;

  const totalDays = differenceInDays(goalEnd, goalStart) + 1;
  const customDays = differenceInDays(customEnd, customStart) + 1;

  if (totalDays <= 0 || customDays <= 0) return 0;

  const amount = currentViewGoal.targetAmount;

  return Math.floor((customDays / totalDays) * amount);
},[currentViewGoal,endDateView,startDateView]);

  const dateDiff = useMemo(() => {
    if (!currentViewGoal) return null;

    const start = new Date(currentViewGoal.targetStartDate);
    const end = new Date(currentViewGoal.targetEndDate);
    return {
      year: differenceInYears(end, start),
      month: differenceInMonths(end, start),
      week: differenceInWeeks(end, start),
      day: differenceInDays(end, start),
    };
  }, [currentViewGoal]);

  // 🔹 Send diff to parent
  useEffect(() => {
    if (dateDiff) {
      deffirentInDays(dateDiff);
    }
  }, [dateDiff, deffirentInDays]);

  // 🔹 Compute target
const currentTarget = useMemo(() => {
  if (!dateDiff || !currentViewGoal) return 0;

  const amount = currentViewGoal.targetAmount;
  const days = dateDiff.day;

  if (!days || days <= 0) return 0;

  switch (filterType) {
    case "today":
      return Math.floor(amount / days);

    case "week":
      return dateDiff.week > 0
        ? Math.floor(amount / dateDiff.week)
        : Math.floor((amount / days) * 7);

    case "month":
      return dateDiff.month > 0
        ? Math.floor(amount / dateDiff.month)
        : Math.floor((amount / days) * 30);

    case "year":
      return dateDiff.year > 0
        ? Math.floor(amount / dateDiff.year)
        : Math.floor((amount / days) * 365);

    case "custom":
      return calculateCustomTarget(); // from previous step

    default:
      return amount;
  }
}, [filterType, dateDiff, currentViewGoal, calculateCustomTarget]);

  // 🔹 Main date logic
  const getDateRange = useCallback((type) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    if (type === "today") {
      start.setHours(0, 0, 0, 0);
    }

    else if (type === "week") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }

    else if (type === "month") {
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
    }

    else if (type === "year") {
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    }

    else if (type === "full") {
      start = new Date(currentViewGoal?.targetStartDate);
      start.setHours(0, 0, 0, 0);
    }

    else if (type === "custom") {
      const parsedStart = parse(startDateView, "dd/MM/yyyy", new Date());
      const parsedEnd = parse(endDateView, "dd/MM/yyyy", new Date());

      if (isValid(parsedStart)) {
        start = new Date(parsedStart);
        start.setHours(0, 0, 0, 0);
      }

      if (isValid(parsedEnd)) {
        end = new Date(parsedEnd);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  },[currentViewGoal?.targetStartDate,endDateView,startDateView]);

  // 🔹 Update range when filter changes
  useEffect(() => {
    if (filterType === "custom") return;
    setDateRange(getDateRange(filterType));
  }, [filterType, getDateRange, setDateRange]);

  // 🔹 Update range for custom
  useEffect(() => {
    if (filterType !== "custom") return;

    if (!startDateView && !endDateView) return;

    setDateRange(getDateRange("custom"));
  }, [startDateView, endDateView, filterType, getDateRange, setDateRange]);

  // 🔹 Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        calendarWrapperRef.current &&
        !calendarWrapperRef.current.contains(event.target)
      ) {
        setIsOpenCalanderOne(false);
        setIsOpenCalanderTwo(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="cashFlowDateSelectionMain">
      <div className="ChangGoalTopPart">
        <Link to={`/company/${user?.companyName}`}>
          <ArrowBackIcon style={{ fontSize: "30px", color: "#fc0" }} />
        </Link>
        <h2>{currentViewGoal?.targetName}</h2>
        <button onClick={() => {AddStepnOpen((prev) => {isClicked(false); return(!prev)})}}>Add more field</button>
      </div>

      <div className="cashFlowDateChange">
        <div className="cashFlow__dateOne">
          <h4>Select Date</h4>

          <div className="targetFinterOptions">
            <select
              name="cashFlowDate"
              className="cashFlowDateSection"
              value={filterType}
              onChange={(e) => {setFilterType(e.target.value); filterdate(e.target.value)}}
            >
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
              <option value="full">Full Target</option>
              <option value="custom">Custom</option>
            </select>

            <FilterListIcon />

            {filterType === "custom" && (
              <div
                className="userSelect_Calender"
                ref={calendarWrapperRef}
              >
                <div className="select_rangeStartEnd">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenCalanderOne((prev) => !prev);
                      setIsOpenCalanderTwo(false);
                    }}
                  >
                    {startDateView || "Select Start Date"}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenCalanderTwo((prev) => !prev);
                      setIsOpenCalanderOne(false);
                    }}
                  >
                    {endDateView || "Select End Date"}
                  </button>
                </div>

                <div className="userSelect_Calender_inner">
                  {isOpenCalanderOne && (
                    <Calendar
                      onDateSelect={setStartDateView}
                      onSelect={setIsOpenCalanderOne}
                      userSelected={startDateView}
                    />
                  )}

                  {isOpenCalanderTwo && (
                    <Calendar
                      onDateSelect={setEndDateView}
                      onSelect={setIsOpenCalanderTwo}
                      userSelected={endDateView}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      <div className='cashFlow__dateTwo'>
        <h4>Progress bar</h4>
        <span style={{left: `${Math.min(Math.max(progressState, 5.4), 94.4)}%`,textAlign:`${progressState < 33 ? 'left' : progressState < 66 ? 'center' : 'right'}`}}>{progressState}%</span>
        <div className='cashFlowProgressbar'>
          <div className='cashFlowProgressbarInner' style={{width:`${progressState}%`}}></div>
        </div>
      </div>
        <div className="cashFlow__dateThree">
          <h4>Target</h4>
          <h2 className='cashFlowTargetCount'>${currentTarget.toLocaleString()}</h2>
        </div>
      </div>
    </div>
  );
}

export default ChangeDate;
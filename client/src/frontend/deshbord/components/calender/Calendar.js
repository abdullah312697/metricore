// src/Calendar.js
import React, { useState, useEffect, useRef } from 'react';
import './Calendar.css';
import { format, isValid, parse } from "date-fns";

const Calendar = ({
   onDateSelect,
   onSelect,
   userSelected,
   bgColor = '#000000',
   ClWidth = '350px',
   ClHeight = '365px',
   ClColor = '#ffb805',
   ClShoadow = '0 0 10px rgb(238 233 233)',
   ClBorder = '1px solid #cccccc57',
   ClTRTDWidthHeight = '40px',
   ClthBdColor = '#5a0000',
   ManthNameWidth = '125px',
   dropDownTop = "52px",
   dropDownLeft = "125px",
   dropDownBgColor = "#000",
   dropDownBoxShadow = "0 0 10px rgba(0, 0, 0, 0.1)",
   dropDownMonthWidth = "125px",
   dropDownYearhWidth = "125px",
   dropDownHeight = "308px",
   dropdownYearLeft = "220px",
   nextPrevContainer = '85px',
   currentDateShowing = '200px',
   nextPrevFontSize = '1.5em',
   MonthYearFontSize = "1.5em",
   ManthSecMarginBtm = '10px',
   CalanderPadding = '20px',
   calanderBorderRadius = '10px',
   tableThFontSize = '16px',
   tableTdFontSize = '14px',
   dropDownMonthPadding = '10px',
   dropDownMonthfontSize = '14px',
   dropDownYearFontSize = '16px'
  }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const calendarRef = useRef(null);

useEffect(() => {
  if (!userSelected) return;

  let date;

  if (typeof userSelected === "string") {
    date = parse(userSelected, "dd/MM/yyyy", new Date());
  } else {
    date = new Date(userSelected);
  }

  if (isValid(date)) {
    setSelectedDate(date);
    setCurrentMonth(date.getMonth());
    setCurrentYear(date.getFullYear());
  }
}, [userSelected]);
  const heightWidth = {
    width:ClTRTDWidthHeight,
    height:ClTRTDWidthHeight,
    backgroundColor:ClthBdColor,
    fontSize:tableThFontSize
  };
  const heightWidthTD = {
    width:ClTRTDWidthHeight,
    height:ClTRTDWidthHeight,
    fontSize:tableTdFontSize
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [];
  for (let i = currentYear - 50; i <= currentYear + 50; i++) {
    years.push(i);
  }

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const calendarDays = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(<td key={`empty-${i}`} style={heightWidthTD}></td>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === selectedDate.getDate() &&
                      currentMonth === selectedDate.getMonth() &&
                      currentYear === selectedDate.getFullYear();
      calendarDays.push(
        <td 
          key={day} 
          className={isToday ? 'current-date' : ''} 
          onClick={(event) => handleDateClick(day, event)}
        style={heightWidthTD}>
          {day}
        </td>
      );
    }

    const rows = [];
    let cells = [];

    calendarDays.forEach((day, index) => {
      if (index % 7 !== 0) {
        cells.push(day);
      } else {
        rows.push(cells);
        cells = [];
        cells.push(day);
      }
      if (index === calendarDays.length - 1) {
        rows.push(cells);
      }
    });

    return rows.map((row, index) => <tr key={index}>{row}</tr>);
  };

  const handleDateClick = (day, e) => {
    const selected = new Date(currentYear, currentMonth, day);
  const formatted = format(selected, "dd/MM/yyyy");
    setSelectedDate(selected);
    onDateSelect && onDateSelect(formatted);
    onSelect && onSelect(false);
  };

  const handleMonthChange = (month) => {
    setCurrentMonth(month);
    setShowMonthDropdown(false);
  };

  const handleYearChange = (year) => {
    setCurrentYear(year);
    setShowYearDropdown(false);
  };

  const toggleMonthDropdown = () => {
    setShowMonthDropdown(!showMonthDropdown);
    setShowYearDropdown(false);
  };

  const toggleYearDropdown = () => {
    setShowYearDropdown(!showYearDropdown);
    setShowMonthDropdown(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  return (
    <div className="calendar" ref={calendarRef} style={{
      backgroundColor:`${bgColor}`,
      width:ClWidth,
      height:ClHeight,
      color:ClColor,
      boxShadow:ClShoadow,
      border:ClBorder,
      padding:CalanderPadding,
      borderRadius:calanderBorderRadius
      }}>
      <div className="month" style={{marginBottom:ManthSecMarginBtm}}>
        <div className='nextpreveContainer' style={{width:nextPrevContainer}}>
          <span className="prev" onClick={handlePrevMonth} style={{fontSize:nextPrevFontSize}}>&#10094;</span>
          <span className="next" onClick={handleNextMonth} style={{fontSize:nextPrevFontSize}}>&#10095;</span>
        </div>
        <div className='currentDateShowing' style={{width:currentDateShowing}}>
          <span className="month-name" onClick={toggleMonthDropdown} style={{width:ManthNameWidth, fontSize:MonthYearFontSize}}>{months[currentMonth]}</span>
          <span className="year-name" onClick={toggleYearDropdown} style={{fontSize:MonthYearFontSize}}>{currentYear}</span>
        </div>
      </div>
      {showMonthDropdown && (
        <div className="dropdown" style={{
          width:dropDownMonthWidth,
          height:dropDownHeight,
          top:dropDownTop,
          left:dropDownLeft,
          backgroundColor:dropDownBgColor,
          boxShadow:dropDownBoxShadow,
        }}>
          {months.map((month, index) => (
            <div key={index} onClick={() => handleMonthChange(index)} style={{padding:dropDownMonthPadding,fontSize:dropDownMonthfontSize}}>
              {month}
            </div>
          ))}
        </div>
      )}
      {showYearDropdown && (
        <div className="dropdown dropdownYear" style={{
                width:dropDownYearhWidth,
                height:dropDownHeight,
                top:dropDownTop,
                left:dropdownYearLeft,
                backgroundColor:dropDownBgColor,
                boxShadow:dropDownBoxShadow
          }}>
          {years.map((year, index) => (
            <div key={index} onClick={() => handleYearChange(year)} style={{fontSize:dropDownYearFontSize,padding:'3px'}}>
              {year}
            </div>
          ))}
        </div>
      )}
      <table className="calendar-table">
        <thead>
          <tr>
            <th style={heightWidth}>Sun</th>
            <th style={heightWidth}>Mon</th>
            <th style={heightWidth}>Tue</th>
            <th style={heightWidth}>Wed</th>
            <th style={heightWidth}>Thu</th>
            <th style={heightWidth}>Fri</th>
            <th style={heightWidth}>Sat</th>
          </tr>
        </thead>
        <tbody>
          {generateCalendar()}
        </tbody>
      </table>
    </div>
  );
};

export default Calendar;

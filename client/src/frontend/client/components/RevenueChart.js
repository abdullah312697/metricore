import { useState, useEffect, useMemo, useRef } from "react";
import { ResponsiveLine } from "@nivo/line";
import { Altaxios } from "../../Altaxios";
import Calendar from "../../deshbord/components/calender/Calendar";

const METRICS = [
  { key: "SoldAmount",   label: "Revenue",  color: "#f59e0b", unit: "$" },
  { key: "SoldQuentity", label: "Quantity", color: "#22c55e", unit: ""  },
  { key: "Profit",       label: "Profit",   color: "#3b82f6", unit: "$" },
];

const PERIODS = [
  { key: "today",  label: "Today"  },
  { key: "week",   label: "Week"   },
  { key: "month",  label: "Month"  },
  { key: "year",   label: "Year"   },
  { key: "custom", label: "Custom" },
];

const getGroupBy = (period) => ({
  today:  "hour",
  week:   "day",
  month:  "day",
  year:   "month",
  full:   "month",
  custom: "day",
}[period] || "day");

const getDateRange = (period) => {
  const now   = new Date();
  const end   = new Date(); end.setUTCHours(23,59,59,999);
  const start = new Date();

  switch (period) {
    case "today": start.setUTCHours(0,0,0,0); break;
    case "week":  start.setDate(now.getDate() - 7);   start.setUTCHours(0,0,0,0); break;
    case "month": start.setMonth(now.getMonth() - 1); start.setUTCHours(0,0,0,0); break;
    case "year":  start.setFullYear(now.getFullYear()-1); start.setUTCHours(0,0,0,0); break;
    default:      start.setUTCHours(0,0,0,0);
  }
  return { start, end };
};

const formatVal = (v, unit) => {
  if (unit === "$") return v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`;
  return v >= 1000 ? `${(v/1000).toFixed(1)}k` : v;
};


// In RevenueChart.js — calculate which ticks to show
const getTickValues = (points, period) => {
  if (!points.length) return undefined;

  const len = points.length;

  // How many ticks to show per period
  const maxTicks = {
    today:  12,  // every 2 hours
    week:   7,   // every day
    month:  6,   // every 5 days
    year:   12,  // every month
    full:   12,
    custom: 7,
  }[period] || 6;

  if (len <= maxTicks) return undefined; // show all if few points

  // Pick evenly spaced ticks
  const step  = Math.ceil(len / maxTicks);
  return points
    .filter((_, i) => i % step === 0 || i === len - 1) // always show last
    .map(p => p.x);
};

export default function RevenueChart() {
  const [period,       setPeriod]      = useState("month");
  const [activeMetric, setActiveMetric]= useState("SoldAmount");
  const [chartPoints,  setChartPoints] = useState([]);
  const [loading,      setLoading]     = useState(false);
  const metric = METRICS.find(m => m.key === activeMetric);
  const [startDateView, setStartDateView] = useState("");
  const [endDateView, setEndDateView] = useState("");
  const [isOpenCalanderOne, setIsOpenCalanderOne] = useState(false);
  const [isOpenCalanderTwo, setIsOpenCalanderTwo] = useState(false);
  const calendarWrapperRef = useRef(null);

function ddmmyyyyToISOString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return null; // or return ""
  }

  const cleanDate = dateStr.trim().replace(/\/$/, "");

  const parts = cleanDate.split("/");

  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

  // ── Fetch whenever period or metric changes ───────────────────
  useEffect(() => {
    if (period === "custom" && (!startDateView || !endDateView)) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { start, end } = period === "custom"
          ? { start: ddmmyyyyToISOString(startDateView), end: ddmmyyyyToISOString(endDateView) }
          : getDateRange(period);
        const res = await Altaxios.get("/chart/companyChartData", {
          params: {
            groupBy: getGroupBy(period),
            start:   start,
            end:     end,
          },
        });
        setChartPoints(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period,endDateView,startDateView]);

  // ── Build nivo data ───────────────────────────────────────────
// In RevenueChart.js — guard against empty/null data
const chartData = useMemo(() => {
  const points = chartPoints
    .filter(p => p.x !== null && p.x !== undefined) // 👈 filter null x values
    .map(p => ({ x: p.x, y: p[activeMetric] || 0 }));

  // nivo needs at least 1 point to render
  if (!points.length) return [{ id: metric.label, data: [{ x: "No Data", y: 0 }] }];

  return [{ id: metric.label, data: points }];
}, [chartPoints, activeMetric, metric.label]);

  // ── Stats ─────────────────────────────────────────────────────
  const total = chartPoints.reduce((s, p) => s + (p[activeMetric] || 0), 0);
  const avg   = chartPoints.length ? Math.round(total / chartPoints.length) : 0;
  const peak  = chartPoints.length ? Math.max(...chartPoints.map(p => p[activeMetric]||0)) : 0;

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

  // Dynamic margin based on rotation need
const needsRotation = chartPoints.length > 10;


  return (
    <div className="rc-root">
<div>
      {/* header */}
      <div className="rc-header">
        <div>
          <h3 className="rc-title">{metric.label} Performance</h3>
        </div>

        {/* metric buttons */}
        <div className="rc-metrics">
          <div className="rc-metrics-section">        
              {METRICS.map(m => (
            <button
              key={m.key}
              className={`rc-metric-btn ${activeMetric === m.key ? "active" : ""}`}
              style={activeMetric === m.key
                ? { borderColor: m.color, color: m.color, background: `${m.color}18` }
                : {}}
              onClick={() => setActiveMetric(m.key)}
            >
              <span className="rc-dot" style={{ background: m.color }} />
              {m.label}
            </button>
          ))}
</div>
<div className="rc-period-section">
                  {/* period selector */}
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`rc-period-btn ${period === p.key ? "active" : ""}`}
            style={period === p.key ? { borderColor: metric.color, color: metric.color } : {}}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      {/* custom date inputs */}
      {period === "custom" && (
        <div className="rc-custom"
          ref={calendarWrapperRef}
        >
                <div className="select_rangeStartEnd">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenCalanderOne((prev) => !prev);
                      setIsOpenCalanderTwo(false);
                    }}
                    style={{width:'105px',zIndex:'1',fontSize:'11px'}}
                  >
                    {startDateView || "Select Start Date"}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpenCalanderTwo((prev) => !prev);
                      setIsOpenCalanderOne(false);
                    }}
                    style={{width:'105px',zIndex:'1',fontSize:'11px'}}
                  >
                    {endDateView || "Select End Date"}
                  </button>
                </div>
                <div className="rc_Calender_inner">
                  {isOpenCalanderOne && (
                    <Calendar
                      onDateSelect={setStartDateView}
                      onSelect={setIsOpenCalanderOne}
                      userSelected={startDateView}
                      bgColor = "#011626"
                      dropDownBgColor = "#011626"
                      ClWidth = "170px"
                      ClHeight = "200px"
                      nextPrevContainer = "20px"
                      nextPrevFontSize = "16px"
                      currentDateShowing = "138px"
                      ManthNameWidth = "25px"
                      MonthYearFontSize = "13px"
                      ManthSecMarginBtm = "5px"
                      CalanderPadding = '5px'
                      calanderBorderRadius = '5px'
                      tableThFontSize = '11px'
                      tableTdFontSize = '11px'
                      ClTRTDWidthHeight = '22px'
                      dropDownMonthWidth = '80px'
                      dropDownYearhWidth = ''
                      dropDownHeight = '167px'
                      dropDownTop = '22px'
                      dropDownLeft = '56px'
                      dropDownMonthPadding = '3px'
                      dropDownMonthfontSize = '11px'
                      dropdownYearLeft = '109px'
                      dropDownYearFontSize = '11px'
                    />
                  )}

                  {isOpenCalanderTwo && (
                    <Calendar
                      onDateSelect={setEndDateView}
                      onSelect={setIsOpenCalanderTwo}
                      userSelected={endDateView}
                      bgColor = "#011626"
                      dropDownBgColor = "#011626"
                      ClWidth = "170px"
                      ClHeight = "200px"
                      nextPrevContainer = "27px"
                      nextPrevFontSize = "16px"
                      currentDateShowing = "138px"
                      ManthNameWidth = "25px"
                      MonthYearFontSize = "13px"
                      ManthSecMarginBtm = "5px"
                      CalanderPadding = '5px'
                      calanderBorderRadius = '5px'
                      tableThFontSize = '11px'
                      tableTdFontSize = '11px'
                      ClTRTDWidthHeight = '22px'
                      dropDownMonthWidth = '80px'
                      dropDownYearhWidth = '56'
                      dropDownHeight = '167px'
                      dropDownTop = '22px'
                      dropDownLeft = '56px'
                      dropDownMonthPadding = '3px'
                      dropDownMonthfontSize = '11px'
                      dropdownYearLeft = '109px'
                      dropDownYearFontSize = '11px'
                    />
                  )}
                </div>

        </div>
      )}

          </div>
        </div>
      </div>
      {/* stats */}
      <div className="rc-stats">
        {[
          { label: "TOTAL", val: formatVal(total, metric.unit) },
          { label: "AVG",   val: formatVal(avg,   metric.unit) },
          { label: "PEAK",  val: formatVal(peak,  metric.unit) },
          { label: "DAYS",  val: chartPoints.length            },
        ].map(s => (
          <div className="rc-stat" key={s.label}>
            <span className="rc-stat__label">{s.label}</span>
            <span className="rc-stat__val" style={s.label === "TOTAL" ? { color: metric.color } : {}}>
              {s.val}
            </span>
          </div>
        ))}
      </div>
</div>
      {/* chart */}
      <div className="rc-chart-wrap">
        {loading ? (
          <div className="rc-loading">Loading...</div>
        ) : (
          <ResponsiveLine
            data={chartData}
            margin={{ top: 16, right: 24, bottom: needsRotation ? 64 : 48, left: 62 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: "auto" }}
            curve="monotoneX"
            axisBottom={{
                tickSize:     0,
                tickPadding:  7,
                tickRotation: chartPoints.length > 20 ? -45 : 0, // 👈 slight rotation only when needed
                legend:       period === "today" ? "Hour"
                            : period === "year" || period === "full" ? "Month"
                            : "Date",
                legendOffset:    chartPoints.length > 10 ? 50 : 42, // 👈 more space when rotated
                legendPosition: "middle",
                tickValues:    getTickValues(chartPoints, period), // 👈 skip dense ticks
              }}
            axisLeft={{
              tickSize: 0, tickPadding: 10,
              legend: metric.label, legendOffset: -52, legendPosition: "middle",
              format: v => formatVal(v, metric.unit),
              tickValues: 5,
            }}
            axisTop={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={true}
            gridYValues={5}
            theme={{
              background: "transparent",
              textColor: "#555",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              grid: { line: { stroke: "#1a1a1a" } },
              axis: {
                ticks:  { text: { fill: "#555", fontSize: 10 } },
                legend: { text: { fill: "#444", fontSize: 10, letterSpacing: "2px" } },
              },
            }}
            colors={[metric.color]}
            lineWidth={2}
            enablePoints={chartPoints.length <= 31}
            pointSize={5}
            pointColor="#0a0a0a"
            pointBorderWidth={2}
            pointBorderColor={metric.color}
            enableArea={true}
            areaOpacity={0.07}
            useMesh={true}
            enableSlices="x"
            sliceTooltip={({ slice }) => (

              <div className="rc-tooltip">
                <strong style={{color:'#bb8600'}}>{slice.points[0].data.xFormatted}</strong>
                <strong style={{color:'#00fff2',marginLeft:'8px'}}>
                  {formatVal(slice.points[0].data.y, metric.unit)}
                </strong>
              </div>
            )}
          />
        )}
      </div>

    </div>
  );
}
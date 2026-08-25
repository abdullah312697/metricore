import { useEffect, useRef, useState } from "react";
import { Altaxios } from "../../Altaxios";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/AuthContext';
import "../../../style/emailverify.css";   // 👈 adjust path to match your other pages

const EmailVerify = () => {
  const [msgStyle, setMsgStyle] = useState({});
  const [errMsg, setErrMsg] = useState("");
  const [isCheckEmpty, setIsCheckEmpty] = useState(true);
  const [isResend, setIsResend] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const {user, emailVerify} = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    user?.isVerify && navigate(`/company/${user?.companyName ?? "fortune"}`);
  },[user,navigate]);
  // ⬇️ Array of 6 input refs
  const inputsRef = useRef([]);
  // Load localStorage data safely

  // Update empty validation
  const updateCheckEmptyState = () => {
    const isEmpty = inputsRef.current.some(
      (input) => !input || input.value.trim() === ""
    );
    setIsCheckEmpty(isEmpty);
  };

  // Move focus backwards
  const backRet = (e) => {
    if (e.keyCode === 8 && e.target.value === "") {
      const index = inputsRef.current.indexOf(e.target);
      if (index > 0) {
        inputsRef.current[index - 1].focus();
      }
    }
    updateCheckEmptyState();
  };

  // Handle input change (only one digit)
  const getVFCode = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 1);

    const index = inputsRef.current.indexOf(e.target);
    if (e.target.value !== "" && index < 5) {
      inputsRef.current[index + 1].focus();
    }

    updateCheckEmptyState();
  };

  // Start countdown
  const startCountdown = () => {
    setCountdown(60);
    setIsResend(true);

    let timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          setIsResend(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Resend code
  const reSendCode = async () => {
    try {
      startCountdown();

      // Clear all inputs
      inputsRef.current.forEach((input) => {
        if (input) input.value = "";
      });
      updateCheckEmptyState();

      // Generate random 6 digit code

      const res = await Altaxios.put("/users/updateVfCode");

      if (res.status === 200) {
        setErrMsg(res.data.message);
        setMsgStyle({ opacity: 1, color: "green" });
        setTimeout(() => {
          setMsgStyle({ opacity: 0 });
        }, 3000);
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Verify the full code
  const getAllWithCode = async () => {
    setIsCheckEmpty(true);

    const verifyCode = inputsRef.current
      .map((input) => input?.value || "")
      .join("");

    try {
      const isVerifyRes = await emailVerify(verifyCode);
      setErrMsg(isVerifyRes.data.message);
      setMsgStyle({ opacity: 1, color: "green" });

      setTimeout(() => {
        if(isVerifyRes?.data?.AccessData?.isVerify === true){
           const name = isVerifyRes.data.AccessData.companyName;   // ← from response, fresh
            navigate(`/company/${name}`);
        }
        setMsgStyle({ opacity: 0 });
      }, 3000);
    } catch (err) {
      if (err.response) {
        setErrMsg(err.response.data.message);
        setMsgStyle({ opacity: 1, color: "red" });
        setTimeout(() => {
          setMsgStyle({ opacity: 0 });
        }, 3000);
            setIsCheckEmpty(false);
      } else {
        console.log(err);
      }
    }
  };

  return (
    <div className="contactContainerMain">
      <div className="contactinnerMain">
        <div className="ev-badge">
          <span className="ev-badge__icon">✉</span>
        </div>

        <span className="ev-eyebrow">Email verification</span>
        <h2 className="emailVerifyheadding">Verify Your Email Address</h2>
        <p className="ev-subtext">
          Enter the 6-digit code we sent to your email to continue.
        </p>

        <div className="verifyEmail">
          {[...Array(6)].map((_, i) => (
            <input
              key={i}
              type="number"
              placeholder="X"
              name="vfCodeOne"
              className="vfInput"
              onKeyDown={backRet}
              onChange={getVFCode}
              ref={(el) => (inputsRef.current[i] = el)}
            />
          ))}
        </div>

        <div className="showMsg" style={msgStyle}>
          {errMsg}
        </div>

        <div className="resendVfcode">
          <input
            type="button"
            className="verifyEmailVfbtn"
            value="Verify"
            disabled={isCheckEmpty}
            onClick={getAllWithCode}
          />

          <div className="ev-resend-row">
            <span className="ev-resend-label">Didn't get the code?</span>
            <input
              type="button"
              className="verifyEmailRsbtn"
              value="Resend"
              onClick={reSendCode}
              disabled={isResend}
            />
            <span className="isResendCountDown">
              {isResend ? `${countdown}s` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerify;
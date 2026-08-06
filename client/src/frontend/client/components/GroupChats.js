import React, { useCallback, useEffect, useRef, useState } from 'react';
import PermMediaOutlinedIcon from '@mui/icons-material/PermMediaOutlined';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import { Altaxios } from '../../Altaxios';
import { useAuth } from "../../../context/AuthContext";
import {socket} from '../../../socket';
import TypingIndicator from "./TypingIndicator";
import { ReactComponent as SentIcon } from "../../../vactors/eye-closed.svg";
import { ReactComponent as DeliveredIcon } from "../../../vactors/eye-half-open.svg";
import { ReactComponent as SeenIcon } from "../../../vactors/eye-open.svg";
import AudioPlayer from './AudioPlayer';
import { VoiceRecorder } from "./VoiceRecorder";
import VoicePlayer from './VoicePlayer';
import wordIcon from '../../../images/icons/office.png';
import XcellIcon from '../../../images/icons/xcell.png';
import zipIcon from '../../../images/icons/zip.png';
import pptIcon from '../../../images/icons/ppt.png';
import fileIcon from '../../../images/icons/open-folder.png';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import GroupsIcon from '@mui/icons-material/Groups';
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import EmojiEmotionsRoundedIcon from '@mui/icons-material/EmojiEmotionsRounded';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import smstone from '../../../audio/sms.mp3';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

function GroupChats() {
  const [isPopup, setIsPopup] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  // const [isPhone, setIsPhone] = useState(false);
  const [previewFiles,setPreviewFiles] = useState([]);
  const fileInputRef = useRef();
  const [lastMessage, setLastMessage] = useState([]);
  const innerRef = useRef(null);
  const [isTypingStart,setIsTypingStart] = useState(false);
  const popupTimerRef = useRef(null);
  const typingTimeManageRef = useRef(null);
  const [convInfo,setConvInfo] = useState({type:"group", participants:[], title:"", avater:"",});
  const {user} = useAuth();
  const [senderInfo, setSenderInfo] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFilesMsg, setPreviewFilesMsg] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);
  const containerRef = useRef(null);
const [tickerIndex, setTickerIndex] = useState(0);
const intervalRef = useRef(null);
const [isPaused, setIsPaused] = useState(false);
const [isGroupInfoOpen,setIsGroupInfoOpen] = useState(false);
const [groupImage,setGroupImage] = useState(null);
const [groupImagePreview,setGroupImagePreview] = useState("");
const [groupTitleName,setGroupTitleName] = useState('');
const [isChangeGropuInfo,setIsChangeGroupInfo] = useState(false);
const [isAdmin,setIsAdmin] = useState(null);
const [responseMsg,setResponseMsg] = useState('');
const [responseMsgStyle,setResponseMsgStyle] = useState({});
const [showEmoji, setShowEmoji] = useState(false);
const pickerRef = useRef(null);
const audioRef = useRef(null);
const [isMutedState,setIsMutedState] = useState(false);

useEffect(()=>{
        const getAllEmployee = async () => {
        try{
          const Emplyee = await Altaxios.get("/newemplyee/getallEmployeeforMessage/");
        if(Emplyee.status === 200){
          const EmplyeeData = Emplyee.data.data;
          setSenderInfo(EmplyeeData);
          const employeeIds = EmplyeeData.map(emp => emp._id);
            setConvInfo(prev => ({
            ...prev,
            title: user?.companyName,
            avater: user?.companyLogo,
            participants: employeeIds,
            }))
        }
      }catch(error){
        if(error.response){
          console.log(error.response.data.message);
        }else{
          console.log(error);
        }
      }
      };
      getAllEmployee();
  
    },[user?.companyName,user?.companyLogo]);

    // ✅ Adjust input area for mobile keyboard
  // useEffect(() => {
  //   const initialVH = window.innerHeight;
  //   function adjust() {
  //     const vv = window.visualViewport;
  //     const vh = vv ? vv.height : window.innerHeight;
  //     const off = vv ? vv.offsetTop : 0;
  //     const keyboardHeight = Math.max(0, initialVH - vh - off);
  //     if (innerRef.current) innerRef.current.style.bottom = keyboardHeight + 'px';
  //   }
  //   if (window.visualViewport) {
  //     window.visualViewport.addEventListener('resize', adjust);
  //     window.visualViewport.addEventListener('scroll', adjust);
  //   }
  //   window.addEventListener('resize', adjust);
  //   adjust();
  //   return () => {
  //     if (window.visualViewport) {
  //       window.visualViewport.removeEventListener('resize', adjust);
  //       window.visualViewport.removeEventListener('scroll', adjust);
  //     }
  //     window.removeEventListener('resize', adjust);
  //   };
  // }, []);


  useEffect(() => {
  socket.on("uploadProgress", ({ senderId: sid, phase, overallPercent, totalFiles }) => {
    // Only show progress bar to the sender
    if (String(sid) !== String(user?.employeeId)) return;

    if (phase === "done") {
      // Small delay so user sees the 100% green bar complete
      setTimeout(() => setUploadProgress(null), 1000);
      return;
    }

    setUploadProgress({ phase, overallPercent, totalFiles });
  });

  return () => socket.off("uploadProgress");
}, [user?.employeeId]);

useEffect(() => {
  if((conversation?.title !== groupTitleName || groupImage !== null) &&  groupTitleName !== ""){
    setIsChangeGroupInfo(true);
  }else{
    setIsChangeGroupInfo(false);
  }
},[conversation?.title, groupTitleName, groupImage]);

  // ✅ Detect mobile
  // useEffect(() => {
  //   const checkDevice = () => {
  //     const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
  //     const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  //     const isMobile = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  //     setIsPhone(isSmallScreen && isMobile);
  //   };
  //   checkDevice();
  //   window.addEventListener('resize', checkDevice);
  //   return () => window.removeEventListener('resize', checkDevice);
  // }, []);

  // ✅ Socket + Fetch conversation
useEffect(() => {
  const loadChat = async () => {
    try {
      if(convInfo?.participants?.length !== 0){
      const { data } = await Altaxios.post('/conversation/newConverSation', convInfo);
      setConversation(data?.conversation);
      setGroupTitleName(data?.conversation?.title);
      setGroupImagePreview(data?.conversation?.avatar);
      setMessages(data.messages || []);
      socket.emit("joinConversation", {
        conversationId: data?.conversation?._id
      });
    }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  loadChat();

}, [convInfo]);

useEffect(() => {
  socket.on("userTyping",({isTyping}) => {
      setIsTypingStart(isTyping);
  });
  return () => {
    socket.off("userTyping");
  };
},[]);

useEffect(() => {
  if (!user?.employeeId) return;

  socket.on("newMessage", (msg) => {
    setMessages((prev) => [...prev, msg]);

    setConversation((prev) => ({
      ...prev,
      lastMessage: msg
    }));

    if (msg.senderId !== user.employeeId) {
    audioRef.current && isMutedState && audioRef.current.play();
      socket.emit("message:delivered", {
        conversationId: conversation?._id,
        employeeId: user.employeeId,
        lastDeliveredMessageId: msg._id
      });

      // popup logic (your existing)
      setLastMessage((prev) => [...prev, msg?.content]);
      setIsPopup(true);
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = setTimeout(() => setIsPopup(false), 5000);
    }
  });
  return () => {
    socket.off("newMessage");
  };
}, [user?.employeeId, conversation?._id, isMutedState]);

useEffect(() => {
  if (!minimized && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.senderId !== user?.employeeId) {
      socket.emit("message:seen", {
        conversationId: conversation?._id,
        employeeId: user?.employeeId,
        lastSeenMessageId: lastMessage._id
      });
    }
  }
}, [
  messages.length,
  minimized,
  conversation?._id,
  messages,
  user?.employeeId
]);

  // ✅ Scroll to bottom on new message
const scrollToBottom = useCallback((smooth = true) => {
  const el = containerRef.current;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
},[]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, minimized, scrollToBottom]);

useEffect(() => {

  // ✅ Delivered update
  socket.on("messageDelivered", ({ employeeId, lastDeliveredMessageId }) => {

    setConversation((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.employeeId === employeeId
            ? { ...p, lastDeliveredMessageId }
            : p
        )
      };
    });

  });

  // ✅ Seen update
  socket.on("messageSeen", ({ employeeId, lastSeenMessageId }) => {

    setConversation((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        participants: prev.participants.map((p) =>
          p.employeeId === employeeId
            ? { ...p, lastReadMessageId: lastSeenMessageId }
            : p
        )
      };
    });

  });

  return () => {
    socket.off("messageDelivered");
    socket.off("messageSeen");
  };

}, []);

const sendMessage = async (blob, thumbUp) => {
  if (!conversation?._id || !user?.employeeId) return;
  setInputMessage("");
  setPreviewFiles([]);

  const formData = new FormData();
  if (blob) {
    formData.append("files", blob);
  } else {
    previewFiles.forEach((item) => formData.append("files", item.file));
  }

  formData.append("conversationId", conversation?._id);
  formData.append("senderId", user?.employeeId);
  if(thumbUp){
    formData.append("content", thumbUp);
  }else{
    formData.append("content", inputMessage);
  }

  try {
     await Altaxios.post("messages/newMessage", formData);
    // Progress is handled entirely via socket events from backend
  } catch (error) {
    console.error(error);
    setUploadProgress(null); // clear on error
  }
};

const handleGroupLogo = (e) => {
    const selectedFiles = e.target.files[0];
    setGroupImage(selectedFiles);
    setGroupImagePreview(URL.createObjectURL(selectedFiles))
    e.target.value = null
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const newFiles = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type,
    }));
    setPreviewFiles((prev) => [...prev, ...newFiles]);
        e.target.value = null
  };

const removeFile = (index) => {
    const updated = [...previewFiles];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setPreviewFiles(updated);
  };

  const formatMessageDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

  const typeingMessage = (e) => {
    setInputMessage(e.target.value);

    socket.emit("typing",{
    conversationId: conversation?._id,
    employeeId: user?.employeeId, 
    isTyping:true
    });

    if(typingTimeManageRef.current){
      clearTimeout(typingTimeManageRef.current);
    }

    typingTimeManageRef.current = setTimeout(() => {
      socket.emit("typing",{
      conversationId: conversation?._id,
      employeeId: user?.employeeId, 
      isTyping:null
      });
    },1500);
  };

  const senderMap = React.useMemo(() => {
  const map = {};
  senderInfo.forEach(user => {
    map[user._id] = user;
  });
  return map;
}, [senderInfo]);

const openPreview = (files, index) => {
  setPreviewFilesMsg(files);
  setCurrentIndex(index);
  setPreviewOpen(true);
};


const handleDownload = async (fileArg) => {
 let file = fileArg || previewFilesMsg?.[currentIndex];
 if (Array.isArray(file)) {
    file = file[0];
  }

  if (!file) {
    console.error("No file found");
    return;
  }

  const url = file?.mediaUrl;
  const type = file?.messageType;
  const fileName = file?.fullName;

  if (!url) {
    console.error("Invalid file URL", file);
    return;
  }

  try {
    const fetchTypes = ["image", "pdf", "text"];

    if (fetchTypes.includes(type)) {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }
    else {
      const link = document.createElement("a");
      let downloadUrl = url;
      downloadUrl = `${url}?fl_attachment=${encodeURIComponent(fileName)}`;
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  } catch (error) {
    console.error("Download failed:", error);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const truncateFileName = (name = "") => {
  if (!name) return "Document";
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot !== -1 ? name.slice(lastDot) : "";
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
  if (base.length <= 15) return name; // no need to truncate short names
  return `${base.slice(0, 5)}...${base.slice(-3)}${ext}`;
};

// singel message <>
const getOtherParticipants = () => {
  return conversation?.participants.filter(
    p => p.employeeId !== user.employeeId
  );
};

useEffect(() => {
const isAdmin = conversation?.participants.some(
  (pr) => pr.employeeId === user.employeeId && pr.role === "admin"
);
const isMute = conversation?.participants.some(
  (pr) => pr.employeeId === user.employeeId && pr.isMuted === true
);
setIsAdmin(isAdmin);
setIsMutedState(isMute);
},[conversation, user.employeeId]);
// singel message </>
const getDeliveredCount = (msg) => {
  const others = getOtherParticipants();
  return others.filter(p =>
    p.lastDeliveredMessageId &&
    String(p.lastDeliveredMessageId) >= String(msg._id)
  ).length;
};

const getSeenCount = (msg) => {
  const others = getOtherParticipants();
  return others.filter(p =>
    p.lastReadMessageId &&
    String(p.lastReadMessageId) >= String(msg._id)
  ).length;
};


const getUnreadMessages = () => {
  const me = conversation?.participants.find(
    p => p.employeeId === user.employeeId
  );

  return messages.filter(msg => {
    if (msg.senderId === user.employeeId) return false;

    if (!me?.lastReadMessageId) return true;

    return String(msg._id) > String(me.lastReadMessageId);
  });
};
const unreadMessages = getUnreadMessages().slice(0, 20);
const unreadMessagesCount = unreadMessages.length;
const loopMessages = [...unreadMessages, ...unreadMessages];
const formatMessagePreview = (msg) => {
  if (msg.messageType === "text") return msg.content;

  if (msg.messageType === "image") return "📷 sent a photo";
  if (msg.messageType === "video") return "🎥 sent a video";
  if (msg.messageType === "audio") return "🎧 sent an audio";
  if (msg.messageType === "file") return "📁 sent a file";

  return "sent a message";
};

const startTicker = useCallback(() => {
  stopTicker(); // prevent duplicate intervals
  setIsPaused(false);
  intervalRef.current = setInterval(() => {
    setTickerIndex((prev) => (prev + 1) % unreadMessages.length);
  }, 3000);
},[unreadMessages.length]);

const stopTicker = () => {
  setIsPaused(true);
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
};

useEffect(() => {
  if (unreadMessages.length === 0) return;

  startTicker();

  return () => stopTicker();
}, [unreadMessages.length, startTicker]);

useEffect(() => {
  if (tickerIndex >= unreadMessages.length) {
    setTickerIndex(0);
  }
}, [unreadMessages.length,tickerIndex]);

const toggleGroupInfo = () => {
  setIsGroupInfoOpen(!isGroupInfoOpen);
}

const GroupDataUpdate = async () => {
  setIsChangeGroupInfo(false);
  const formData = new FormData();
  if (groupImage) {
    formData.append("files", groupImage);
  }
  if (groupTitleName) {
    formData.append("title", groupTitleName);
  }
  formData.append("actorEmployeeId", user.employeeId);
  try {
    const res = await Altaxios.put(
      `conversation/updateGroupInfo/${conversation?._id}`, // ✅ dynamic id
      formData
    );
    setResponseMsg(res.data.message);
    setResponseMsgStyle({opacity:1});

    setTimeout(() => {
          setResponseMsg('');
          setResponseMsgStyle({opacity:0})
    }, 3000);
  } catch (err) {
    console.log(err.response?.data);
  }
};

const pertiCipentIsmuteUpdate = async (muted) => {
  try {
    const isMutedValue = await Altaxios.put(
      `conversation/updatePerticipent/${conversation?._id}`,
      { isMuted: muted, actorEmployeeId: user.employeeId }
    );
    const resValue = isMutedValue?.data?.participant?.isMuted;
    setIsMutedState(resValue);
    setConversation((prev) => {
      const updatedParticipants = prev.participants.map((pr) => {
        if (pr.employeeId?.toString() === user?.employeeId?.toString()) {
          return { ...pr, isMuted: resValue };
        }
        return pr;
      });
      return {
        ...prev,
        participants: updatedParticipants,
      };
    });

  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const isOnlyEmoji = (text) => {
  return text.trim() === "👍";
};

//return jsx<>
  return (
        <div className='GroupChatMainContainer'>
                  <div className='live_message_mainHeader'>
                    <div className='messangerHeadrFunction'>
                      {
                        isMutedState ? (<VolumeUpIcon onClick={() => {pertiCipentIsmuteUpdate(false)}} className='isMutedIcon'/>) :
                        (<VolumeOffIcon onClick={() => {pertiCipentIsmuteUpdate(true)}} className='isMutedIcon'/>)
                      }
                      {isAdmin && <InfoOutlinedIcon onClick={toggleGroupInfo} className='adminOnlybtnInfo'/>}
                    </div>
                    {isGroupInfoOpen && (
                      <div className='groupInformatinAndUpdate'>
                        <div className='changeGroupImage'>
                          <label>
                            <AddAPhotoIcon className='changeGroupImagesvgone'/>
                            <input type='file' onChange={handleGroupLogo}/>
                          </label>
                          {groupImagePreview !== "" ? (<img src={groupImagePreview} alt="group logo"/>) :
                          (<GroupsIcon className='changeGroupImagesvgone changeGroupImagesvgtwo'/>) }
                        </div>
                        <div className='changeGroupName'>
                          <input type='text' value={groupTitleName} name="title" onChange={(e) => {setGroupTitleName(e.target.value)}}/>
                        </div>
                        <div className='responseMessage' style={responseMsgStyle}>{responseMsg}</div>
                        <button disabled={!isChangeGropuInfo} onClick={GroupDataUpdate}>Change</button>
                      </div>
                    )}
                    <div className='gruopNameAndLogo'>
                        {conversation?.avatar !== "" ? (
                          <img src={conversation?.avatar} alt="groupIcon"/>
                        ) : (
                          <GroupsIcon className="liveConversationAvater" />
                        )}
                      <h3>{conversation?.title ?? "Company"}</h3>
                      </div>
                    <div className='groupNotificatin_view'>
                      {minimized && unreadMessagesCount > 0 && (<div className='unreadMessagesCount'>{unreadMessagesCount}</div>)}
                      <div
  className="tickerContainer"
  onMouseEnter={stopTicker}
  onMouseLeave={startTicker}
>
      {loopMessages.length === 0 && (        
      <div className="tickerItem">
        New message will appear here!
      </div>
    )}

  {minimized && (<div className={`tickerWrapper ${isPaused ? "paused" : ""}`}>
    {loopMessages.length > 0 && loopMessages.map((msg, index) => {
          const sender = senderMap[msg.senderId];

      return (
        <div className="tickerItem" key={index}>
          <img
            src={sender.EmplyeeProfile}
            alt={sender.YemplyeeName}
          />
          {formatMessagePreview(msg)}
        </div>
      );
    })}
  </div>)}
</div>
                      <div className='group_Notifican_toggleBtns'>
                          {minimized ? (
                            <KeyboardArrowUpOutlinedIcon onClick={() => setMinimized((m) => !m)} className="toggleMinimizebtn" />
                          ) : (
                            <KeyboardArrowDownOutlinedIcon onClick={() => setMinimized((m) => !m)} className="toggleMinimizebtn" />
                          )}
                      </div>
                    </div>
                  </div>

        <div className={`liveChatsInnerPart_group ${minimized ? 'minimized' : ''}`} ref={innerRef}>
          {!minimized && (
            <>
              <div className="liveCustomerMessages" ref={containerRef}>
                {messages.map((msg, index) => {
                const currentDate = formatMessageDate(msg.createdAt);
                const prevMessage = messages[index - 1];
                const nextMessage = messages[index + 1];
                const prevDate = prevMessage
                  ? formatMessageDate(prevMessage.createdAt)
                  : null;
                const showDate = currentDate !== prevDate;
                const isMine = String(msg?.senderId) === String(user?.employeeId);
                const isLastFromSender = (!nextMessage || nextMessage.senderId !== msg.senderId);
                const showAvatar = !isMine && isLastFromSender;
                const sender = senderMap[msg.senderId];
                const showName =
                  !isMine &&
                  (!prevMessage || prevMessage.senderId !== msg.senderId);
                const lastMessage = String(conversation?.lastMessage?.messageId) === String(msg?._id);
                const isNotmyMsg = String(conversation?.lastMessage?.senderId) !== String(user?.employeeId);

                // ── Separate visual (image/video) from everything else ──
                const visualMedia = msg.media?.filter(
                  f => f.messageType === "image" || f.messageType === "video"
                ) || [];
                const otherMedia = msg.media?.filter(
                  f => f.messageType !== "image" && f.messageType !== "video"
                ) || [];
                const mediaLength = otherMedia.length;

                 const deliveredCount = getDeliveredCount(msg);
                  const seenCount = getSeenCount(msg);
                  const total = conversation.participants.length - 1;
                  
                return (
                  <React.Fragment key={msg?._id}>
                    {showDate && (
                      <div className="chatDateSeparator">
                        {currentDate}
                      </div>
                    )}

                    <div
                      className={`${isMine ? 'liveCustomerMessagesCustomer' : 'liveCustomerMessagesAgent'}`}
                      style={{ marginBottom: `${lastMessage && isNotmyMsg ? "25px" : ""}` }}
                    >
                      {showName && (
                        <div className="senderName">
                          {sender?.YemplyeeName}
                        </div>
                      )}
                      {showAvatar && sender && (
                        <img
                          src={sender.EmplyeeProfile}
                          alt={sender.YemplyeeName}
                          className="chatAvatar"
                        />
                      )}

                      <div className='message_containerInner'>

                        {/* ── VISUAL MEDIA: images & videos in grid ── */}
                        {visualMedia.length > 0 && (
                          <div className={`mediaGrid mediaCount_${Math.min(visualMedia.length, 4)}`}>
                            {visualMedia.slice(0, 4).map((file, i) => {
                              const isExtra = visualMedia.length > 4 && i === 3;
                              const extraCount = visualMedia.length - 3;
                              return (
                                <div
                                  key={i}
                                  className="mediaItem"
                                  onClick={() => openPreview(visualMedia, i)}
                                >
                                  {file.messageType === "image" && (
                                    <img src={file.mediaUrl} alt="media" />
                                  )}
                                  {file.messageType === "video" && (
                                    <video src={file.mediaUrl} />
                                  )}
                                  {isExtra && (
                                    <div className="mediaOverlay">+{extraCount}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* ── OTHER MEDIA: each file shown individually ── */}
                        {otherMedia.map((file, i) => {
                          const fileType = file.messageType;
                          return (
                            <div key={i} className="mediaItem">

                              {/* PDF */}
                              {fileType === "pdf" && (
                              <div style={{ margin: mediaLength > 1 ? "10px 0px" : "0px" }}>
                                <div
                                  onClick={() => openPreview([file], 0)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <div className='pdfpopUPshow'>PDF</div>
                                  <img
                                    src={file.mediaUrl.replace("/upload/", "/upload/w_215,h_140,c_fill,g_north,q_auto,f_auto/")}
                                    style={{ objectFit: 'inherit' }}
                                    alt="pdf"
                                  />
                                </div>
                                </div>
                              )}

                              {/* AUDIO */}
                              {fileType === "audio" && (
                                <div style={{ margin: mediaLength > 1 ? "10px 0px" : "0px" }}>
                                <AudioPlayer
                                  source={file.mediaUrl}
                                  isMine={isMine}
                                  isVoice={false}
                                  srcIndex={`${msg._id}-audio-${i}`}
                                />
                                </div>
                              )}

                              {/* DOCUMENTS & OTHER FILES */}
                              {(fileType === "text" ||
                                fileType === "word" ||
                                fileType === "excel" ||
                                fileType === "powerpoint" ||
                                fileType === "archive" ||
                                fileType === "file"
                              ) && (
                                <div className={mediaLength > 1 ? "fileDocsSeperator" : ""} >
                                <div className="previewDownlaodFile">
                                  <div className='iconsforFiles'>
                                    {
                                      fileType === "text" ? (<DescriptionIcon/>) :
                                    (<img
                                      src={
                                        fileType === "word" ? wordIcon :
                                        fileType === "excel" ? XcellIcon :
                                        fileType === "powerpoint" ? pptIcon :
                                        fileType === "archive" ? zipIcon :
                                        fileIcon
                                      }

                                      alt="fileIcons"
                                    />)
                                    }
                                    <span className='fileInnerText'>{truncateFileName(file.fullName)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDownload(file)}
                                    className='filedownloadIcon'
                                  >
                                    <ArrowDownwardIcon />
                                  </button>
                                </div>
                                </div>
                              )}

                            </div>
                          );
                        })}

                        {/* TEXT MESSAGE */}
                        {msg?.messageType === "text" && (
                          <div
                            className={`liveCustomerMessagesText ${isMine ? 'liveAgentMessage' : ''}`}
                          >
                            {
                              isOnlyEmoji(msg?.content) ?
                               (<ThumbUpIcon style={{color:'#0af'}}/>) : 
                                msg?.content
                            }
                          </div>
                        )}

                        <div className='messageInnerTimeAndStatus'>
                          <div className="liveCustomerMessagesTime">
                            {formatMessageTime(msg?.createdAt)}
                          </div>
                          {isMine && (
                            <div className="liveCustomerMessagesStatus">
                              {seenCount === total ? (<SeenIcon />) : 
                              deliveredCount === total ? (<DeliveredIcon />) : 
                              (<SentIcon />)
                              }
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </React.Fragment>
                );
                })}


                {/* ── Media Preview Modal ── */}
                {previewOpen && (
                  <div className="mediaModal" onClick={() => setPreviewOpen(false)}>
                    <div className="mediaModalContent" onClick={(e) => e.stopPropagation()}>

                      <div className="mediaModalTopBar">
                        {/* Prev / Next navigation */}
                        <button
                          className="downloadBtn"
                          onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                          disabled={currentIndex === 0}
                        >
                          ‹ Prev
                        </button>
                        <span style={{ fontSize: "12px", color: "#ccc" }}>
                          {currentIndex + 1} / {previewFilesMsg.length}
                        </span>
                        <button
                          className="downloadBtn"
                          onClick={() => setCurrentIndex(i => Math.min(i + 1, previewFilesMsg.length - 1))}
                          disabled={currentIndex === previewFilesMsg.length - 1}
                        >
                          Next ›
                        </button>
                        <button className="downloadBtn" onClick={() => handleDownload()}>
                          ⬇ Download
                        </button>
                        <button className="closeBtn" onClick={() => setPreviewOpen(false)}>✕</button>
                      </div>

                      {previewFilesMsg[currentIndex]?.messageType === "image" && (
                        <img src={previewFilesMsg[currentIndex].mediaUrl} alt="preview" />
                      )}
                      {previewFilesMsg[currentIndex]?.messageType === "video" && (
                        <video controls autoPlay src={previewFilesMsg[currentIndex].mediaUrl} />
                      )}
                      {previewFilesMsg[currentIndex]?.messageType === "audio" && (
                        <audio controls autoPlay src={previewFilesMsg[currentIndex].mediaUrl} />
                      )}
                      {previewFilesMsg[currentIndex]?.messageType === "pdf" && (
                        <iframe
                          src={previewFilesMsg[currentIndex].mediaUrl}
                          width="500px"
                          height="450px"
                          style={{ border: "none" }}
                          title="pdfviewar"
                        />
                      )}
                      {previewFilesMsg[currentIndex]?.messageType === "file" && (
                        <a href={previewFilesMsg[currentIndex].mediaUrl} target="_blank" rel="noreferrer">
                          Download File
                        </a>
                      )}

                    </div>
                  </div>
                )}


                {/* uploadProgress &&  ── Upload Progress Bar ── */}
                {uploadProgress && uploadProgress?.phase === "uploading" && (
                  <div className="uploadProgressWrapper">
                    <div className="uploadProgressTrack">
                      <div
                        className="uploadProgressFill"
                      />
                      {`⬆ Uploading ${uploadProgress.overallPercent}%`}
                      <div className='uloadPrgressFillinner'
                          style={{
                            width: `${uploadProgress.overallPercent}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
                {/* ── File Previews (before sending) ── */}
                {previewFiles.length > 0 &&
                  <div className="preview-container">
                    {previewFiles.map((item, index) => (
                      <div key={index} className="preview-item">
                        <button className="remove-btn" onClick={() => removeFile(index)}>✕</button>
                        {item.type.startsWith("image") ? (
                          <img src={item.preview} alt="" className="preview-image" />
                        ) : (
                          <div className="file-box">FILE</div>
                        )}
                      </div>
                    ))}
                    <div
                      className="add-btn"
                      onClick={() => fileInputRef.current.click()}
                      style={{ display: `${previewFiles.length > 9 ? 'none' : ''}` }}
                    >
                      {previewFiles.length} +
                    </div>
                  </div>
                }

              {isTypingStart && <TypingIndicator />}
              <div className="liveConverstaionFooter">

                <label className="liveChatfileInput">
                  <input type="file" multiple onChange={handleFileChange} ref={fileInputRef} />
                  <PermMediaOutlinedIcon className={`footerliveMedia ${previewFiles.length > 10 ? 'inActiveLiveChantsendbtn' : ''}`} />
                </label>
                <div className='messagnesEmojiINputContainer'>
                  <EmojiEmotionsRoundedIcon onClick={() => setShowEmoji(prev => !prev)}/>
                <input
                  type="text"
                  className="liveConverstaionInput"
                  name="userInputText"
                  value={inputMessage}
                  placeholder="Type a message..."
                  onChange={typeingMessage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputMessage.trim()) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

              {showEmoji && (
                <div style={{
                  position: "absolute",
                  bottom: "40px",
                  right: "130px",
                  zIndex: 1000,
                  height:'280px',
                  width:'245px',
                  overflow:'hidden'
                }} ref={pickerRef}>
                  <Picker
                      data={data}
                      onEmojiSelect={(emoji) => {
                        setInputMessage((prev) => prev + emoji.native);
                      }}
                      theme="dark"
                      emojiSize={20}
                      perLine={6}
                      previewPosition="none"
                      navPosition="top"
                    />
                    </div>
                )}
                  <div className='thumbUpandVoiceSection'>

                      {(previewFiles.length === 0 && inputMessage === "") ? (
                  <VoiceRecorder
                    onSend={(blob) => sendMessage(blob)}
                    onCancel={() => console.log("Cancelled")}
                    audioPlayerComponent={VoicePlayer}
                  />
                ) : (
                  <SendRoundedIcon
                    className="liveChatsSendbtn"
                    onClick={() => sendMessage()}
                  />
                )}
              </div>
            </div>
                <ThumbUpIcon onClick={() => {sendMessage(null,"👍")}} className='thumbUpbigEmoji'/>
              </div>
            </>
          )}
</div>
              {<audio src={smstone} style={{opacity:'0', position:'absolute'}} ref={audioRef}/>}

        </div>
  );
}

export default GroupChats;
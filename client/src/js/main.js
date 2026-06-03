let isOpen = false;
export function closeMenu(){
    const style =  document.querySelector(".mobile_menu");
    if(!isOpen){
       style.style = `left:0;opacity:1`;
        isOpen = true;
    }else{
        style.style = `left:-142;opacity:0`;
        isOpen = false;
    }
}

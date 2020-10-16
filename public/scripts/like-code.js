let likeBtn = document.querySelectorAll(".likeBtn");
let likeCount = document.querySelectorAll(".likes>b");
for(let i=0;i<likeBtn.length;i++){
    likeBtn[i].addEventListener("click", function(){
        if(likeBtn[i].classList.contains("far")){
            likeBtn[i].classList.remove("far");
            likeBtn[i].classList.add("fas");
            likeBtn[i].classList.add("liked");
            let str = likeCount[i].textContent;
            let c = parseInt(str.split(" "));
            c++;
            likeCount[i].textContent = c + " likes";
        }
        else{
            likeBtn[i].classList.remove("fas");
            likeBtn[i].classList.add("far");
            likeBtn[i].classList.remove("liked");
            let str = likeCount[i].textContent;
            let c = parseInt(str.split(" "));
            c--;
            likeCount[i].textContent = c + " likes";
        }
    });
}

if ($(window).width() < 550) {
    $('.home-main').removeClass('container');
} else {
    $('.home-main').addClass('container');
}

var typed = new Typed(".text", {
    strings: [
        "a Data Scientist",
        "a BI Specialist",
        "an End-to-end Developer",
        "a Machine Learning Enthusiast"],
    typeSpeed: 100,
    backSpeed: 100,
    backDelay: 1000,
    loop: true
});

const bodySection = document.querySelector("#body-1");
if (bodySection) {const bodyObserver = new IntersectionObserver((entries) => {entries.forEach(entry => {
    if(entry.isIntersecting){bodySection.classList.add("animate-svg");} else {bodySection.classList.remove("animate-svg");}});}, 
       {threshold: 0.35});bodyObserver.observe(bodySection);}

/*const bodySection = document.querySelector("#body-1");
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting){bodySection.classList.add("animate-svg");}else{bodySection.classList.remove("animate-svg");
        }});},{threshold:0.35});
observer.observe(bodySection);*/

const aboutSection = document.querySelector(".about-container");
if (aboutSection) {const aboutObserver = new IntersectionObserver((entries) => {entries.forEach(entry => {
    if(entry.isIntersecting){aboutSection.classList.add("show");}});}, 
       {threshold: 0.3});aboutObserver.observe(aboutSection);}

/*const aboutSection = document.querySelector('.about-container');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting){aboutSection.classList.add('show');}});}, {threshold: 0.3});
observer.observe(aboutSection);*/

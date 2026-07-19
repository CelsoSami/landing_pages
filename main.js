document.addEventListener('DOMContentLoaded', () => {

    const menuToggle = document.getElementById('menuToggle');
    const headerRight = document.getElementById('headerRight');

    if (menuToggle && headerRight) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            headerRight.classList.toggle('open');
        });

        headerRight.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                headerRight.classList.remove('open');
            });
        });
    }

    var typed = new Typed(".text", {
        strings: [
            "a Data Scientist",
            "a BI Specialist",
            "an ML Engineer",
            "a Data Architect",
            "an AI Explorer"
        ],
        typeSpeed: 80,
        backSpeed: 50,
        backDelay: 1500,
        loop: true
    });

    const aboutSection = document.querySelector(".about-container");
    if (aboutSection) {
        const aboutObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    aboutSection.classList.add("show");
                }
            });
        }, { threshold: 0.15 });
        aboutObserver.observe(aboutSection);
    }

    document.querySelectorAll('.work-card, .project-card, .stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity .6s ease, transform .6s ease';
    });

    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, i * 80);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.work-card, .project-card, .stat-card').forEach(el => {
        cardObserver.observe(el);
    });

    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 80) {
            header.style.background = 'rgba(6, 6, 14, 0.92)';
            header.style.borderBottomColor = 'rgba(0, 212, 255, 0.08)';
        } else {
            header.style.background = 'rgba(6, 6, 14, 0.75)';
            header.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
        }
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 150;
            if (window.scrollY >= top) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current ||
                (current === '' && link.getAttribute('href') === '#')) {
                link.classList.add('active');
            }
        });
    });

});

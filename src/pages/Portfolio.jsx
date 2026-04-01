import React from 'react';
import './Portfolio.css';

const portfolioItems = [
    { title: "K-League Player Mental Consulting", category: "Pro Sports", desc: "Focus enhancement, performance recovery and anxiety management throughout the season." },
    { title: "National Archery Team", category: "National Team", desc: "Gold medal peak performance training and rigorous consistency routine building." },
    { title: "PGA Tour Golfer Coaching", category: "Golf", desc: "Overcoming performance plateaus (yips) and pressure under high stakes tournaments." },
    { title: "Youth Elite Athlete Program", category: "Youth Foundation", desc: "Building a foundation of mental toughness and resilience for aspiring athletes." },
    { title: "eSports Team Synergy", category: "eSports", desc: "Burnout prevention, tilt-management, and improving team communication dynamics." },
    { title: "Olympic Fencer Routine Optimization", category: "Olympics", desc: "Pre-competition mental preparation and aggressive mindset conditioning." },
];

const Portfolio = () => {
    return (
        <div className="portfolio-container page-container">
            <div className="portfolio-header">
                <h1 className="heading-h1">Portfolio & Cases</h1>
                <p className="text-large text-muted">
                    Take a look at how our sports psychology counseling has empowered athletes to reach their absolute peak performance.
                </p>
            </div>
            
            <div className="portfolio-grid container">
                {portfolioItems.map((item, index) => (
                    <div className="portfolio-card glass-panel" key={index}>
                        <div className="portfolio-image-placeholder">
                            <span className="category-badge">{item.category}</span>
                        </div>
                        <div className="portfolio-content">
                            <h3 className="heading-h3">{item.title}</h3>
                            <p className="text-medium text-muted">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Portfolio;

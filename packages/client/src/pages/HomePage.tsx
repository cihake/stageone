/**
 * Home page — landing. Hero + two primary CTAs + a "what you can do here"
 * strip. Written for a portfolio-facing audience: someone who lands on
 * mystageone.org should understand what StageOne is in ~5 seconds.
 */
import { Link } from 'react-router-dom';
import './home.css';

export function HomePage() {
  return (
    <article className="home">
      <section className="home-hero">
        <h1 className="home-hero__title">Hear what&apos;s next.</h1>
        <p className="home-hero__lede">
          StageOne spotlights indie artists you haven&apos;t heard yet. Browse local musicians,
          stream their tracks, and find shows near you.
        </p>

        <div className="home-hero__ctas">
          <Link to="/artists" className="home-cta home-cta--primary">
            Browse artists
          </Link>
          <Link to="/gigs" className="home-cta home-cta--secondary">
            Upcoming gigs
          </Link>
        </div>
      </section>

      <section className="home-features" aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" className="home-features__heading">
          What you can do here
        </h2>

        <div className="home-feature-grid">
          <div className="home-feature">
            <h3 className="home-feature__title">Discover artists</h3>
            <p>
              Browse the directory or filter by city and genre. Every artist has a press-kit
              page with tracks, upcoming gigs, and social links.
            </p>
          </div>

          <div className="home-feature">
            <h3 className="home-feature__title">Stream tracks</h3>
            <p>
              Click any track to play. A persistent player follows you around the site so the
              music keeps going while you browse.
            </p>
          </div>

          <div className="home-feature">
            <h3 className="home-feature__title">Follow &amp; get a feed</h3>
            <p>
              Sign in to follow artists. Your <Link to="/feed">feed</Link> pulls together their
              newest tracks and upcoming gigs in one place.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

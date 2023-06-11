import * as React from "react"
import { Link } from "gatsby"
import * as Styles from "./layout.module.css"

const ListLink = props => (
  <li style={{ display: `inline-block`, marginRight: `1rem` }}>
    <Link to={props.to} style={{ textDecoration:`none` }}>{props.children}</Link>
  </li>
)

const main = ({ children }) => (
  <React.StrictMode>
    <div style={{ margin: `1.5rem auto`, padding: `0 1rem` }}>
      <header className={Styles.top}>
        <Link to="/" style={{ textShadow: `none`, backgroundImage: `none`, textDecoration:`none`,color:`white` }}>
          <h3 style={{ display: `inline` }}>NovicNet</h3>
        </Link>
        <ul style={{ listStyle: `none`, float: `right` }}>
          <ListLink to="/articles/">articles</ListLink>
          <ListLink to="/toys/">toys</ListLink>
        </ul>
      </header>
      { children }
    </div>
    </React.StrictMode>
)
export default main
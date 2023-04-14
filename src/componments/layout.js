import * as React from "react"
import { Link } from "gatsby"
const ListLink = props => (
  <li style={{ display: `inline-block`, marginRight: `1rem` }}>
    <Link to={props.to} style={{ textDecoration:`none` }}>{props.children}</Link>
  </li>
)

const main = ({ children }) => (
  <div style={{ margin: `3rem auto`, padding: `0 1rem` }}>
    <header style={{ marginBottom: `1.5rem` }}>
      <Link to="/" style={{ textShadow: `none`, backgroundImage: `none`, textDecoration:`none` }}>
        <h3 style={{ display: `inline` }}>NovicNet</h3>
      </Link>
      <ul style={{ listStyle: `none`, float: `right` }}>
        <ListLink to="/articles/">文</ListLink>
      </ul>
    </header>
    { children }
  </div>
)
export default main
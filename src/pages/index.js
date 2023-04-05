import * as React from 'react'
import Layout from "../componments/layout"
import { Link } from "gatsby"

const main = () => (
  <div style={{ color: 'white', margin: `3rem auto`, maxWidth: 600}}>
    <title>NovicNet</title>
    <Layout />
    <p>Welcome to NovicNet !</p>
    <p>HAVEN'T DONE</p>
    <Link to="/page2/">Go On</Link>
  </div>
)
export default main
import * as React from 'react'
import { Link } from "gatsby"
import Layout from "../componments/layout"

const main = () => (
  <div>
    <title>NovicNet</title>
    <Layout>
      <p>Welcome to NovicNet !</p>
      <p>HAVEN'T DONE</p>
      <Link to="/blog/">Go On</Link>
    </Layout>
  </div>
)
export default main
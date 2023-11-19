import * as React from 'react'
import Layout from "../componments/layout"
import { Link } from "gatsby"
import InputButton from './input';

const main = () => (
  <div style={{ color: `purple` }}>
    <title>NovicNet - articles</title>
    <Layout>
      <p>Test Page</p>
      <Link to='/'>Home</Link>
      <h1>React Input and Button</h1>
      <InputButton />
    </Layout>
  </div>
)

export default main
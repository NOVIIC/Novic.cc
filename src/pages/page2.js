import * as React from 'react'
import Header from "../componments/header"
import Container from "../componments/container"
import { Link } from "gatsby"

const main = () => (
  <div style={{ color: `purple` }}>
    <title>HAVEN'T DONE</title>
    <Header />
    <Container>
      <p>Test Page</p>
    </Container>
    <Link to='/'>Home</Link>
  </div>
)
export default main
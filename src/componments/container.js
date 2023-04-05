import * as React from 'react'
import * as containerStyles from "./container.module.css"

const main = ({ children }) => (
  <div className={containerStyles.container}>{children}</div>
)
export default main
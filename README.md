#Smap Client

This repository contains the client code (Web Browser) included in a release of the smap server.

## Modules

The client code is grouped into modules
* fieldManagerClient.  Administration Pages
* tasks.  Task Pages
* fieldAnalysis.  The internal dashboard
* myWork.  Launch and manage webForms
* smapServer. Everything else including webforms

##### Other Projects

*  dashboard.  Integration of AWS quicksight. No longer maintained.

# Development

* Clone this project
* Set an environment variable WEBSITE_DOCS equal the document root for the Apache web server
* Create a directory called "deploy" in your hone directory (~/deploy)
* Install Grunt
  * Install Node
  * Install Npm
  * Install the Grunt CLI
  * Install Grunt
  * Install "grunt-contrib-uglify"

# Deployment

Run ./depALl.sh to build and deploy the modules.
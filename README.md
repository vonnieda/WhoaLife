# TODO

* Settings
    * If the app is not yet configured settings should show automatically,
    otherwise past entries.
    * Show the command and time the user needs to enter into scheduler.

# WhoaLife

An homage to the excellent, but short lived, OhLife daily diary system.

# Installation

This app is designed to be run on Heroku. You can run it elsewhere but you'll
need to have your own MongoDB instance and a way to run scheduled tasks.

The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

Create an app on Heroku

    heroku create
    
Optionally rename the app to something you like

    heroku apps:rename YOUR_APP_NAME
    
Make note of your app's web URL

    heroku apps:info | grep 'Web URL'
    
Add the required plugins

    heroku addons:add mongohq
    heroku addons:add sendgrid
    heroku addons:add cloudmailin --target http://YOUR_APP_NAME.herokuapp.com/emails
    heroku addons:add scheduler
    
Deploy the app

    git push heroku master
    
Perform initial app setup

    heroku apps:open
    
Add a scheduled task to send your daily email

    heroku addons:open scheduler
    
In the resulting dashboard, add a once daily task with the following command.

    curl -XPOST http://YOUR_APP_NAME.herokuapp.com/jobs/send
    
You should set the time of the task to run when you'd like to receive your
email. Make sure you take timezone into account.

# Running Locally

    npm start


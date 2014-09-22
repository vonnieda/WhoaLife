The following instructions assume you already have a verified Heroku account. If
you don't you'll need to set one up first. While this does require a verified
account, all of the services used are free so no charges should actually be
accumulated.

Create an app on Heroku

    heroku create
    
Optionally rename the app to something you like

    heroku apps:rename my_whoalife
    
Make note of your app's web URL

    heroku apps:info | grep 'Web URL'
    
Add the required plugins

    heroku addons:add mongohq
    heroku addons:add sendgrid
    heroku addons:add cloudmailin --target http://your_web_url.herokuapp.com/emails
    heroku addons:add scheduler
    
Set some configuration variables

    heroku config:set TO_NAME='Your Name'
    heroku config:set TO_EMAIL='youremail@email.com'
    heroku config:set WEB_URL='http://your_web_url.herokuapp.com'
    # See http://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    heroku config:set TZ='America/Los_Angeles'
    
Deploy the app

    git push heroku master

Add a scheduled task to get your nightly email

    heroku addons:open scheduler
    
In the resulting dashboard, add a once daily task with the following command.

    curl -XPOST ${WEB_URL}jobs/send
    
You should set the time of the task to run when you'd like to receive your
email.
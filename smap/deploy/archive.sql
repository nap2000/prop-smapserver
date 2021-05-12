-- Archive view records older than 100 days
WITH archived_rows AS (
    DELETE FROM log
    WHERE
        (event = 'view' or event = 'dashboard view' or event = 'API view' or event = 'API CSV view' or event = 'API single record view'
        	or event = 'user location view' or event = 'user acivity view'
        	or event = 'create survey'
        	or event = 'notification'
        	or event = 'error'
        	or event = 'email')
        and log_time < now() - interval '100 days'
    RETURNING *
)
INSERT INTO log_archive
SELECT * FROM archived_rows;
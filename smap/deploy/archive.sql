-- Archive view records older than 100 days
WITH archived_rows AS (
    DELETE FROM log
    WHERE
        event = 'view' 
        and log_time < now() - interval '100 days'
    RETURNING *
)
INSERT INTO log_archive
SELECT * FROM archived_rows;
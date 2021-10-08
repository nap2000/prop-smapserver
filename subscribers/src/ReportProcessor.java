import java.io.File;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.model.DatabaseConnections;
import org.smap.subscribers.Subscriber;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

/*****************************************************************************
 * 
 * This file is part of SMAP.
 * 
 * SMAP is free software: you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * SMAP is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * SMAP. If not, see <http://www.gnu.org/licenses/>.
 * 
 ******************************************************************************/

public class ReportProcessor {

	DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();

	private static Logger log = Logger.getLogger(Subscriber.class.getName());

	private class ReportsLoop implements Runnable {
		DatabaseConnections dbc = new DatabaseConnections();
		String serverName;
		String basePath;
		String confFilePath;

		public ReportsLoop(String basePath, String confFilePath) {
			this.basePath = basePath;
			this.confFilePath = confFilePath;
		}

		public void run() {

			int delaySecs = 5;
			int count = 0;
		
			boolean loop = true;
			while(loop) {
				
				String subscriberControl = GeneralUtilityMethods.getSettingFromFile("/smap/settings/subscriber");
				if(subscriberControl != null && subscriberControl.equals("stop")) {
					log.info("---------- Report Processor Stopped");
					loop = false;
				} else {
					
					log.info("rprprprprprprp Report Processor");
					
					try {
						// Make sure we have a connection to the database
						GeneralUtilityMethods.getDatabaseConnections(dbf, dbc, confFilePath);
						serverName = GeneralUtilityMethods.getSubmissionServer(dbc.sd);
						
					} catch (Exception e) {
						log.log(Level.SEVERE, e.getMessage(), e);
					}
					
					// Sleep and then go again
					try {
						Thread.sleep(delaySecs * 1000);
					} catch (Exception e) {
						// ignore
					}
				}

			}
		}
	}


	/**
	 * @param args
	 */
	public void go(String smapId, String basePath) {

		String confFilePath = "./" + smapId;

		try {
			Thread t = new Thread(new ReportsLoop(basePath, confFilePath));
			t.start();
			

		} catch (Exception e) {
			e.printStackTrace();
		} finally {

			/*
			 * Do not close connections!  This processor is supposed to run forever
			 */

		}

	}
	
}
